using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using Microsoft.Web.WebView2.Core;

namespace VRChatSpeechAssistant
{
    public partial class MainWindow : Window
    {
        private HttpListener? _httpServer;
        private CancellationTokenSource? _httpServerCts;
        private int _httpPort = 3230;
        private string _webRootPath = "";
        
        // WebView2
        private bool _micPermissionGranted = false;
        
        // OSC
        private UdpClient? _oscClient;
        private string _oscIp = "127.0.0.1";
        private int _oscPort = 9000;
        private bool _oscEnabled = true;
        private bool _oscRealtimeEnabled = false;
        
        // 实时更新节流和防抖
        private DateTime _lastRealtimeSend = DateTime.MinValue;
        private System.Threading.Timer? _realtimeDebounceTimer;
        private readonly object _realtimeTimerLock = new object();
        private string _pendingRealtimeText = "";
        private const int RealtimeDebounceMs = 300;   // 防抖延迟（等待用户停止说话）
        private const int RealtimeThrottleMs = 500;   // 节流间隔（最小发送间隔）
        
        // VRC 麦克风同步
        private UdpClient? _oscListener;
        private CancellationTokenSource? _listenerCts;
        private readonly object _vrcListenerLock = new object();
        private bool _vrcSyncEnabled = true;
        private bool _vrcMicMuted = false;
        private bool _hasReceivedVrcStatus = false;
        private int _listenPort = 9001;
        
        // 消息队列
        private Queue<string> _messageQueue = new Queue<string>();
        private bool _isProcessingQueue = false;
        private int _queueIntervalSeconds = 8;
        
        // 防止设置加载时触发保存
        private bool _isLoading = true;
        
        // OSC 发送历史
        public ObservableCollection<OscHistoryEntry> OscHistory { get; } = new ObservableCollection<OscHistoryEntry>();
        private const int MaxHistoryEntries = 100;
        
        // 子窗口
        private SettingsWindow? _settingsWindow;
        private LogWindow? _logWindow;

        public MainWindow()
        {
            InitializeComponent();
            
            // 设置 Web 根目录路径
            var exePath = AppDomain.CurrentDomain.BaseDirectory;
            _webRootPath = Path.Combine(exePath, "dist");
            
            // 加载设置（在初始化 UI 之后）
            LoadSettings();
            
            InitializeOsc();
            AddLog("INFO", "桌面桥接服务已启动");
            
            // 设置加载完成
            _isLoading = false;
            
            // 异步初始化 WebView2 和服务器
            _ = InitializeAsync();
            
            // 如果启用了 VRC 同步，自动启动监听
            if (_vrcSyncEnabled)
            {
                Task.Run(() => StartVrcListener());
            }
        }

        private async Task InitializeAsync()
        {
            try
            {
                AddLog("INFO", "正在初始化 WebView2...");
                
                // 配置 WebView2 用户数据文件夹
                var userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "VRChatSpeechRecognition",
                    "WebView2Data"
                );
                
                // 创建 WebView2 环境
                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder, new CoreWebView2EnvironmentOptions());
                await webView.EnsureCoreWebView2Async(env);
                
                // 配置 WebView2
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                
                // 自动允许麦克风权限
                webView.CoreWebView2.PermissionRequested += (s, e) =>
                {
                    if (e.PermissionKind == CoreWebView2PermissionKind.Microphone)
                    {
                        e.State = CoreWebView2PermissionState.Allow;
                        
                        // 只在首次授权时记录日志
                        if (!_micPermissionGranted)
                        {
                            _micPermissionGranted = true;
                            AddLog("INFO", "已自动授予麦克风权限");
                        }
                    }
                };
                
                // 监听导航事件
                webView.CoreWebView2.NavigationStarting += (s, e) =>
                {
                    AddLog("INFO", $"开始导航: {e.Uri}");
                };
                
                webView.CoreWebView2.NavigationCompleted += (s, e) =>
                {
                    if (e.IsSuccess)
                    {
                        AddLog("INFO", "页面加载成功");
                    }
                    else
                    {
                        AddLog("ERROR", $"页面加载失败: {e.WebErrorStatus}");
                    }
                };
                
                // 监听来自 JavaScript 的消息（WebView2 桥接）
                webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
                
                AddLog("INFO", "WebView2 初始化成功");
                
                // 启动 HTTP 服务器
                await Task.Delay(500);
                StartHttpServer();
                
                // 等待服务器启动
                await Task.Delay(1000);
                
                // 导航到本地页面
                var url = $"http://localhost:{_httpPort}";
                webView.CoreWebView2.Navigate(url);
                AddLog("INFO", $"正在加载页面: {url}");
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"初始化失败: {ex.Message}");
                MessageBox.Show($"WebView2 初始化失败:\n{ex.Message}\n\n请确保已安装 WebView2 Runtime。",
                    "错误", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void LoadSettings()
        {
            try
            {
                var settings = Properties.Settings.Default;
                
                // 加载 OSC 设置
                _oscEnabled = settings.OscEnabled;
                ChkOscEnabled.IsChecked = _oscEnabled;
                
                // 加载 OSC 实时更新设置
                _oscRealtimeEnabled = settings.OscRealtimeEnabled;
                ChkOscRealtime.IsChecked = _oscRealtimeEnabled;
                
                // 加载 VRC 同步设置
                _vrcSyncEnabled = settings.VrcSyncEnabled;
                ChkVrcSync.IsChecked = _vrcSyncEnabled;
                
                // 加载自动打开网页设置（WebView2 版本不需要此选项）
                // ChkAutoOpenWeb.IsChecked = settings.AutoOpenWeb;
                
                // 加载 IP 和端口设置
                _oscIp = settings.OscIp;
                _oscPort = settings.OscPort;
                _listenPort = settings.ListenPort;
                _httpPort = settings.HttpPort;
                
                AddLog("INFO", "已加载保存的设置");
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"加载设置失败: {ex.Message}");
                // 使用默认值
                ChkOscEnabled.IsChecked = true;
                ChkOscRealtime.IsChecked = false;
                ChkVrcSync.IsChecked = true;
                // ChkAutoOpenWeb.IsChecked = false;
                _httpPort = 3230;
            }
        }
        
        /// <summary>
        /// 从设置窗口调用，重新加载设置
        /// </summary>
        public void ReloadSettings()
        {
            _isLoading = true;
            
            try
            {
                var settings = Properties.Settings.Default;
                
                // 更新 OSC 设置
                _oscEnabled = settings.OscEnabled;
                ChkOscEnabled.IsChecked = _oscEnabled;
                
                _oscRealtimeEnabled = settings.OscRealtimeEnabled;
                ChkOscRealtime.IsChecked = _oscRealtimeEnabled;
                
                _oscIp = settings.OscIp;
                _oscPort = settings.OscPort;
                
                // 更新 VRC 同步设置
                bool oldVrcSync = _vrcSyncEnabled;
                _vrcSyncEnabled = settings.VrcSyncEnabled;
                ChkVrcSync.IsChecked = _vrcSyncEnabled;
                
                // 更新自动打开网页设置（WebView2 版本不需要此选项）
                // ChkAutoOpenWeb.IsChecked = settings.AutoOpenWeb;
                
                // 如果 VRC 同步设置变化，重启监听
                if (oldVrcSync != _vrcSyncEnabled)
                {
                    if (_vrcSyncEnabled)
                    {
                        Task.Run(() => StartVrcListener());
                    }
                    else
                    {
                        StopVrcListener();
                    }
                }
                
                // 更新监听端口（需要重启监听）
                int oldListenPort = _listenPort;
                _listenPort = settings.ListenPort;
                
                if (oldListenPort != _listenPort && _vrcSyncEnabled)
                {
                    StopVrcListener();
                    Task.Run(() => StartVrcListener());
                }
                
                // 更新 HTTP 端口（需要重启服务器）
                int oldHttpPort = _httpPort;
                _httpPort = settings.HttpPort;
                
                if (oldHttpPort != _httpPort)
                {
                    StopHttpServer();
                    Task.Delay(500).ContinueWith(_ =>
                    {
                        Dispatcher.Invoke(() => StartHttpServer());
                    });
                }
                
                AddLog("INFO", "设置已更新");
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"重新加载设置失败: {ex.Message}");
            }
            finally
            {
                _isLoading = false;
            }
        }

        private void InitializeOsc()
        {
            try
            {
                _oscClient = new UdpClient();
                AddLog("INFO", "OSC 客户端已初始化");
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"OSC 初始化失败: {ex.Message}");
            }
        }

        private void StartHttpServer()
        {
            try
            {
                // 检查 dist 目录是否存在
                if (!Directory.Exists(_webRootPath))
                {
                    AddLog("ERROR", $"Web 根目录不存在: {_webRootPath}");
                    AddLog("INFO", "请先构建 Vue 应用（运行 vue-app/构建.bat）");
                    return;
                }
                
                _httpServer = new HttpListener();
                _httpServer.Prefixes.Add($"http://localhost:{_httpPort}/");
                _httpServer.Start();
                
                _httpServerCts = new CancellationTokenSource();
                
                // 在后台线程处理 HTTP 请求
                Task.Run(() => ProcessHttpRequests(_httpServerCts.Token));
                
                AddLog("INFO", $"HTTP 服务器已启动 - http://localhost:{_httpPort}");
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"启动 HTTP 服务器失败: {ex.Message}");
                if (ex.Message.Contains("Access is denied"))
                {
                    AddLog("INFO", "提示：可能需要管理员权限，或者端口被占用");
                }
            }
        }
        
        private async Task ProcessHttpRequests(CancellationToken cancellationToken)
        {
            try
            {
                while (!cancellationToken.IsCancellationRequested && _httpServer != null && _httpServer.IsListening)
                {
                    try
                    {
                        var context = await _httpServer.GetContextAsync();
                        _ = Task.Run(() => HandleHttpRequest(context), cancellationToken);
                    }
                    catch (HttpListenerException) when (cancellationToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (ObjectDisposedException)
                    {
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                if (!cancellationToken.IsCancellationRequested)
                {
                    Dispatcher.Invoke(() => AddLog("ERROR", $"HTTP 服务器错误: {ex.Message}"));
                }
            }
        }
        
        private void HandleHttpRequest(HttpListenerContext context)
        {
            try
            {
                var request = context.Request;
                var response = context.Response;
                
                // 获取请求的文件路径
                var urlPath = request.Url?.AbsolutePath ?? "/";
                if (urlPath == "/")
                {
                    urlPath = "/index.html";
                }
                
                // 移除开头的斜杠并组合完整路径
                var filePath = Path.Combine(_webRootPath, urlPath.TrimStart('/'));
                
                // 安全检查：确保文件在 webRoot 目录内
                var fullPath = Path.GetFullPath(filePath);
                var fullWebRoot = Path.GetFullPath(_webRootPath);
                
                if (!fullPath.StartsWith(fullWebRoot, StringComparison.OrdinalIgnoreCase))
                {
                    response.StatusCode = 403;
                    response.Close();
                    return;
                }
                
                // 检查文件是否存在
                if (File.Exists(fullPath))
                {
                    // 设置 Content-Type
                    var extension = Path.GetExtension(fullPath).ToLowerInvariant();
                    response.ContentType = GetContentType(extension);
                    
                    // 读取并发送文件
                    var fileBytes = File.ReadAllBytes(fullPath);
                    response.ContentLength64 = fileBytes.Length;
                    response.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                    response.StatusCode = 200;
                }
                else
                {
                    // 对于 SPA，如果文件不存在，返回 index.html
                    var indexPath = Path.Combine(_webRootPath, "index.html");
                    if (File.Exists(indexPath))
                    {
                        response.ContentType = "text/html";
                        var fileBytes = File.ReadAllBytes(indexPath);
                        response.ContentLength64 = fileBytes.Length;
                        response.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                        response.StatusCode = 200;
                    }
                    else
                    {
                        response.StatusCode = 404;
                        var errorBytes = Encoding.UTF8.GetBytes("404 - File Not Found");
                        response.OutputStream.Write(errorBytes, 0, errorBytes.Length);
                    }
                }
                
                response.Close();
            }
            catch (Exception ex)
            {
                Dispatcher.Invoke(() => AddLog("ERROR", $"处理 HTTP 请求失败: {ex.Message}"));
                try
                {
                    context.Response.StatusCode = 500;
                    context.Response.Close();
                }
                catch { }
            }
        }
        
        private string GetContentType(string extension)
        {
            return extension switch
            {
                ".html" => "text/html",
                ".css" => "text/css",
                ".js" => "application/javascript",
                ".json" => "application/json",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".gif" => "image/gif",
                ".svg" => "image/svg+xml",
                ".ico" => "image/x-icon",
                ".woff" => "font/woff",
                ".woff2" => "font/woff2",
                ".ttf" => "font/ttf",
                ".eot" => "application/vnd.ms-fontobject",
                _ => "application/octet-stream"
            };
        }

        private void StopHttpServer()
        {
            try
            {
                _httpServerCts?.Cancel();
                _httpServerCts?.Dispose();
                _httpServerCts = null;
                
                if (_httpServer != null)
                {
                    _httpServer.Stop();
                    _httpServer.Close();
                    _httpServer = null;
                }
                
                AddLog("INFO", "HTTP 服务器已停止");
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"停止 HTTP 服务器失败: {ex.Message}");
            }
        }

        /// <summary>
        /// 处理来自 WebView2 的消息（JavaScript → C#）
        /// </summary>
        private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                // 使用 WebMessageAsJson 属性而不是 TryGetWebMessageAsString()
                // 因为 TryGetWebMessageAsString() 在某些情况下会抛出异常
                var json = e.WebMessageAsJson;
                AddLog("WEB", $"收到消息: {json}");
                
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                
                if (!root.TryGetProperty("type", out var typeProp))
                {
                    AddLog("WEB", "收到无效消息：缺少 type 字段");
                    return;
                }
                
                var type = typeProp.GetString();
                
                if (!root.TryGetProperty("data", out var dataProp))
                {
                    AddLog("WEB", $"收到无效消息：缺少 data 字段 (type={type})");
                    return;
                }
                
                // WebMessageReceived 事件已经在 UI 线程上，直接处理
                ProcessWebViewMessage(type ?? "", dataProp);
            }
            catch (JsonException ex)
            {
                AddLog("ERROR", $"解析 WebView 消息失败: {ex.Message}");
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"处理 WebView 消息失败: {ex.Message}");
                AddLog("ERROR", $"错误堆栈: {ex.StackTrace}");
            }
        }
        
        /// <summary>
        /// 分发 WebView 消息到对应的处理方法
        /// </summary>
        private void ProcessWebViewMessage(string type, JsonElement data)
        {
            switch (type)
            {
                case "recognition_result":
                    // 最终识别结果
                    if (data.TryGetProperty("text", out var textProp))
                    {
                        var text = textProp.GetString() ?? "";
                        var translatedText = "";
                        
                        if (data.TryGetProperty("translatedText", out var transProp))
                        {
                            translatedText = transProp.GetString() ?? "";
                        }
                        
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            HandleRecognitionResult(text, translatedText);
                        }
                    }
                    break;
                    
                case "recognition_interim":
                    // 临时识别文本（实时更新）
                    if (data.TryGetProperty("text", out var interimTextProp))
                    {
                        var text = interimTextProp.GetString() ?? "";
                        var translatedText = "";
                        
                        if (data.TryGetProperty("translatedText", out var interimTransProp))
                        {
                            translatedText = interimTransProp.GetString() ?? "";
                        }
                        
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            HandleInterimText(text, translatedText);
                        }
                    }
                    break;
                    
                default:
                    AddLog("WEB", $"未知消息类型: {type}");
                    break;
            }
        }
        
        /// <summary>
        /// 发送消息到 WebView2（C# → JavaScript）
        /// </summary>
        private async Task SendToWebView(string type, object data)
        {
            if (webView?.CoreWebView2 == null)
            {
                AddLog("ERROR", "WebView2 未初始化，无法发送消息");
                return;
            }
            
            try
            {
                var message = new
                {
                    type,
                    data,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };
                
                var json = JsonSerializer.Serialize(message, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
                
                // 触发 JavaScript 的 hostMessage 事件
                var script = $@"
                    (function() {{
                        try {{
                            const event = new CustomEvent('hostMessage', {{
                                detail: {json}
                            }});
                            window.dispatchEvent(event);
                        }} catch (err) {{
                            console.error('处理宿主消息失败:', err);
                        }}
                    }})();
                ";
                
                await webView.CoreWebView2.ExecuteScriptAsync(script);
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"发送消息到 WebView 失败: {ex.Message}");
            }
        }

        private void HandleRecognitionResult(string text, string translatedText = "")
        {
            string displayText = text;
            if (!string.IsNullOrWhiteSpace(translatedText))
            {
                displayText = $"{text}({translatedText})";
                AddLog("INFO", $"识别结果: \"{text}\" (翻译: \"{translatedText}\")");
            }
            else
            {
                AddLog("INFO", $"识别结果: \"{text}\"");
            }
            
            // 检查 VRC 同步状态
            bool shouldSend = true;
            if (_vrcSyncEnabled)
            {
                if (!_hasReceivedVrcStatus)
                {
                    shouldSend = false;
                    AddLog("VRC", "等待 VRChat 麦克风状态...");
                }
                else if (_vrcMicMuted)
                {
                    shouldSend = false;
                    AddLog("VRC", "VRC 麦克风静音，跳过 OSC 发送");
                }
            }
            
            // 添加到队列（使用包含翻译的文本）
            if (shouldSend)
            {
                AddToQueue(displayText);
            }
        }
        
        private void HandleInterimText(string text, string translatedText = "")
        {
            // 检查是否启用实时更新
            if (!_oscRealtimeEnabled)
            {
                return;
            }
            
            // 检查 VRC 同步状态
            if (_vrcSyncEnabled)
            {
                if (!_hasReceivedVrcStatus || _vrcMicMuted)
                {
                    return;
                }
            }
            
            // 构建显示文本
            string displayText = text;
            if (!string.IsNullOrWhiteSpace(translatedText))
            {
                displayText = $"{text}({translatedText})";
            }
            
            _pendingRealtimeText = displayText;
            
            // 混合节流和防抖策略
            var now = DateTime.Now;
            var timeSinceLastSend = (now - _lastRealtimeSend).TotalMilliseconds;
            
            if (timeSinceLastSend < RealtimeThrottleMs)
            {
                // 在节流期内，设置防抖定时器（等待用户停止说话）
                lock (_realtimeTimerLock)
                {
                    // 先释放旧定时器，避免资源泄漏
                    _realtimeDebounceTimer?.Dispose();
                    _realtimeDebounceTimer = new System.Threading.Timer(_ =>
                    {
                        Dispatcher.Invoke(() => SendOscRealtimeThrottled());
                    }, null, RealtimeDebounceMs, Timeout.Infinite);
                }
            }
            else
            {
                // 超过节流间隔，立即发送
                SendOscRealtimeThrottled();
            }
        }
        
        private void SendOscRealtimeThrottled()
        {
            var now = DateTime.Now;
            if ((now - _lastRealtimeSend).TotalMilliseconds < RealtimeThrottleMs)
                return;
            
            _lastRealtimeSend = now;
            SendOscRealtime(_pendingRealtimeText);
        }
        
        private void SendOscRealtime(string text)
        {
            if (!_oscEnabled)
            {
                return;
            }
            
            try
            {
                var data = BuildOscMessage("/chatbox/input", text, true);
                var endpoint = new IPEndPoint(IPAddress.Parse(_oscIp), _oscPort);
                _oscClient?.Send(data, data.Length, endpoint);
                
                // 实时更新不记录到历史，避免刷屏
                // AddLog("OSC", $"实时: \"{text}\"");
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"OSC 实时发送失败: {ex.Message}");
            }
        }
        
        private void AddToQueue(string text)
        {
            var segments = SplitText(text, 144);
            
            foreach (var segment in segments)
            {
                _messageQueue.Enqueue(segment);
            }
            
            AddLog("INFO", $"已添加 {segments.Count} 条消息到队列 (队列长度: {_messageQueue.Count})");
            
            if (!_isProcessingQueue && _messageQueue.Count > 0)
            {
                ProcessQueue();
            }
        }
        
        private List<string> SplitText(string text, int maxLength)
        {
            var result = new List<string>();
            
            if (text.Length <= maxLength)
            {
                result.Add(text);
                return result;
            }
            
            if (text.Contains(" "))
            {
                var regex = new Regex($".{{1,{maxLength}}}(\\s|$)");
                var matches = regex.Matches(text);
                foreach (Match match in matches)
                {
                    var segment = match.Value.Trim();
                    if (!string.IsNullOrEmpty(segment))
                    {
                        result.Add(segment);
                    }
                }
            }
            else
            {
                for (int i = 0; i < text.Length; i += maxLength)
                {
                    int length = Math.Min(maxLength, text.Length - i);
                    result.Add(text.Substring(i, length));
                }
            }
            
            return result;
        }
        
        private async void ProcessQueue()
        {
            if (_isProcessingQueue) return;
            
            _isProcessingQueue = true;
            
            try
            {
                while (_messageQueue.Count > 0)
                {
                    var message = _messageQueue.Dequeue();
                    var displayMessage = _messageQueue.Count > 0 ? $"{message} ..." : message;
                    
                    SendOsc(displayMessage);
                    
                    if (_messageQueue.Count > 0)
                    {
                        await Task.Delay(400);
                        SendOscTyping(true);
                        await Task.Delay(_queueIntervalSeconds * 1000);
                    }
                }
            }
            finally
            {
                _isProcessingQueue = false;
            }
        }
        
        private void SendOscTyping(bool isTyping)
        {
            try
            {
                var data = BuildOscTypingMessage("/chatbox/typing", isTyping);
                var endpoint = new IPEndPoint(IPAddress.Parse(_oscIp), _oscPort);
                _oscClient?.Send(data, data.Length, endpoint);
                
                AddLog("OSC", $"打字状态: {isTyping}");
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"OSC 打字状态发送失败: {ex.Message}");
            }
        }
        
        private byte[] BuildOscTypingMessage(string address, bool isTyping)
        {
            var buffer = new List<byte>();
            
            var addrBytes = Encoding.UTF8.GetBytes(address);
            buffer.AddRange(addrBytes);
            buffer.Add(0);
            while (buffer.Count % 4 != 0) buffer.Add(0);
            
            var typeTag = isTyping ? ",T" : ",F";
            var typeBytes = Encoding.UTF8.GetBytes(typeTag);
            buffer.AddRange(typeBytes);
            buffer.Add(0);
            while (buffer.Count % 4 != 0) buffer.Add(0);
            
            return buffer.ToArray();
        }

        private void SendOsc(string text)
        {
            if (!_oscEnabled)
            {
                AddLog("OSC", "OSC 已禁用，跳过发送");
                return;
            }
            
            try
            {
                var data = BuildOscMessage("/chatbox/input", text, true);
                var endpoint = new IPEndPoint(IPAddress.Parse(_oscIp), _oscPort);
                _oscClient?.Send(data, data.Length, endpoint);
                
                AddLog("OSC", $"已发送: \"{text}\"");
                
                // 添加到历史记录
                AddOscHistory(text);
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"OSC 发送失败: {ex.Message}");
            }
        }
        
        private void AddOscHistory(string message)
        {
            Dispatcher.Invoke(() =>
            {
                // 添加到顶部
                OscHistory.Insert(0, new OscHistoryEntry
                {
                    Time = DateTime.Now.ToString("HH:mm:ss"),
                    Message = message
                });
                
                // 限制历史记录数量
                while (OscHistory.Count > MaxHistoryEntries)
                {
                    OscHistory.RemoveAt(OscHistory.Count - 1);
                }
                
                // 更新计数（WebView2 版本界面已移除此控件）
                // TxtHistoryCount.Text = $"（{OscHistory.Count} 条）";
            });
        }
        
        private void ChkOscEnabled_Changed(object sender, RoutedEventArgs e)
        {
            if (_isLoading) return;
            
            _oscEnabled = ChkOscEnabled.IsChecked == true;
            Properties.Settings.Default.OscEnabled = _oscEnabled;
            Properties.Settings.Default.Save();
            
            AddLog("OSC", $"OSC 发送: {(_oscEnabled ? "启用" : "禁用")}");
        }
        
        private void ChkOscRealtime_Changed(object sender, RoutedEventArgs e)
        {
            if (_isLoading) return;
            
            _oscRealtimeEnabled = ChkOscRealtime.IsChecked == true;
            Properties.Settings.Default.OscRealtimeEnabled = _oscRealtimeEnabled;
            Properties.Settings.Default.Save();
            
            AddLog("OSC", $"OSC 实时更新: {(_oscRealtimeEnabled ? "启用" : "禁用")}");
        }
        
        private void ChkVrcSync_Changed(object sender, RoutedEventArgs e)
        {
            if (_isLoading) return;
            
            _vrcSyncEnabled = ChkVrcSync.IsChecked == true;
            Properties.Settings.Default.VrcSyncEnabled = _vrcSyncEnabled;
            Properties.Settings.Default.Save();
            
            if (_vrcSyncEnabled)
            {
                Task.Run(() => StartVrcListener());
            }
            else
            {
                StopVrcListener();
            }
            
            AddLog("VRC", $"VRC 麦克风同步: {(_vrcSyncEnabled ? "启用" : "禁用")}");
        }
        
        // WebView2 版本不需要此方法
        // private void ChkAutoOpenWeb_Changed(object sender, RoutedEventArgs e)
        // {
        //     if (_isLoading) return;
        //
        //     Properties.Settings.Default.AutoOpenWeb = ChkAutoOpenWeb.IsChecked == true;
        //     Properties.Settings.Default.Save();
        //
        //     AddLog("INFO", $"启动时自动打开网页: {(ChkAutoOpenWeb.IsChecked == true ? "启用" : "禁用")}");
        // }

        private byte[] BuildOscMessage(string address, string message, bool boolValue)
        {
            var buffer = new List<byte>();
            
            var addrBytes = Encoding.UTF8.GetBytes(address);
            buffer.AddRange(addrBytes);
            buffer.Add(0);
            while (buffer.Count % 4 != 0) buffer.Add(0);
            
            var typeTag = boolValue ? ",sT" : ",sF";
            var typeBytes = Encoding.UTF8.GetBytes(typeTag);
            buffer.AddRange(typeBytes);
            buffer.Add(0);
            while (buffer.Count % 4 != 0) buffer.Add(0);
            
            var msgBytes = Encoding.UTF8.GetBytes(message);
            buffer.AddRange(msgBytes);
            buffer.Add(0);
            while (buffer.Count % 4 != 0) buffer.Add(0);
            
            return buffer.ToArray();
        }

        private async void StartVrcListener()
        {
            UdpClient? listener = null;
            CancellationTokenSource? cts = null;
            
            try
            {
                // 使用锁保护资源创建
                lock (_vrcListenerLock)
                {
                    // 确保之前的资源已清理
                    if (_oscListener != null || _listenerCts != null)
                    {
                        AddLog("VRC", "检测到未清理的监听器资源，正在清理...");
                        CleanupVrcListenerResources();
                    }
                    
                    listener = new UdpClient(_listenPort);
                    cts = new CancellationTokenSource();
                    
                    _oscListener = listener;
                    _listenerCts = cts;
                }
                
                AddLog("VRC", $"VRC 监听已启动 - 端口 {_listenPort}");
                
                while (!cts.Token.IsCancellationRequested)
                {
                    try
                    {
                        var result = await listener.ReceiveAsync();
                        ParseOscMessage(result.Buffer);
                    }
                    catch (OperationCanceledException) { break; }
                    catch (ObjectDisposedException) { break; }
                    catch (Exception ex)
                    {
                        AddLog("VRC", $"接收错误: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                AddLog("ERROR", $"VRC 启动监听失败: {ex.Message}");
                
                // 异常时清理资源
                lock (_vrcListenerLock)
                {
                    CleanupVrcListenerResources();
                }
            }
        }

        private void StopVrcListener()
        {
            lock (_vrcListenerLock)
            {
                try
                {
                    CleanupVrcListenerResources();
                    _hasReceivedVrcStatus = false;
                    AddLog("VRC", "VRC 监听已停止");
                }
                catch (Exception ex)
                {
                    AddLog("ERROR", $"停止 VRC 监听失败: {ex.Message}");
                }
            }
        }
        
        /// <summary>
        /// 清理 VRC 监听器资源（必须在锁内调用）
        /// </summary>
        private void CleanupVrcListenerResources()
        {
            // 取消并释放 CancellationTokenSource
            if (_listenerCts != null)
            {
                try
                {
                    _listenerCts.Cancel();
                    _listenerCts.Dispose();
                }
                catch (ObjectDisposedException)
                {
                    // 已经被释放，忽略
                }
                finally
                {
                    _listenerCts = null;
                }
            }
            
            // 关闭并释放 UdpClient
            if (_oscListener != null)
            {
                try
                {
                    _oscListener.Close();
                    _oscListener.Dispose();
                }
                catch (ObjectDisposedException)
                {
                    // 已经被释放，忽略
                }
                finally
                {
                    _oscListener = null;
                }
            }
        }

        private void ParseOscMessage(byte[] data)
        {
            try
            {
                if (data.Length < 4) return;
                
                int addressEnd = Array.IndexOf(data, (byte)0);
                if (addressEnd < 0) return;
                
                string address = Encoding.UTF8.GetString(data, 0, addressEnd);
                
                if (address == "/avatar/parameters/MuteSelf")
                {
                    int typeTagStart = addressEnd + 1;
                    while (typeTagStart % 4 != 0) typeTagStart++;
                    
                    if (typeTagStart >= data.Length) return;
                    
                    string typeTag = Encoding.UTF8.GetString(data, typeTagStart, Math.Min(4, data.Length - typeTagStart));
                    
                    bool newMuteState = false;
                    if (typeTag.Contains("T")) newMuteState = true;
                    else if (typeTag.Contains("F")) newMuteState = false;
                    
                    if (!_hasReceivedVrcStatus)
                    {
                        _hasReceivedVrcStatus = true;
                        AddLog("VRC", $"首次接收状态: Muted={newMuteState}");
                    }
                    
                    if (newMuteState != _vrcMicMuted)
                    {
                        _vrcMicMuted = newMuteState;
                        AddLog("VRC", $"麦克风状态: {(_vrcMicMuted ? "静音" : "开启")}");
                    }
                }
            }
            catch (Exception ex)
            {
                AddLog("VRC", $"解析错误: {ex.Message}");
            }
        }

        // WebView2 版本界面已移除历史记录功能
        // private void BtnClearHistory_Click(object sender, RoutedEventArgs e)
        // {
        //     OscHistory.Clear();
        //     // TxtHistoryCount.Text = "（0 条）";
        // }
        
        private void BtnSettings_Click(object sender, RoutedEventArgs e)
        {
            if (_settingsWindow == null || !_settingsWindow.IsLoaded)
            {
                _settingsWindow = new SettingsWindow();
                _settingsWindow.Owner = this;
            }
            
            _settingsWindow.ShowDialog();
        }
        
        private void BtnLog_Click(object sender, RoutedEventArgs e)
        {
            if (_logWindow == null || !_logWindow.IsLoaded)
            {
                _logWindow = new LogWindow();
                _logWindow.Owner = this;
            }
            
            _logWindow.Show();
            _logWindow.Activate();
        }
        
        private void AddLog(string type, string message)
        {
            // 添加到日志窗口
            if (Dispatcher.CheckAccess())
            {
                // 已经在 UI 线程上，直接调用
                _logWindow?.AddLog(type, message);
            }
            else
            {
                // 不在 UI 线程上，使用 Dispatcher
                Dispatcher.Invoke(() =>
                {
                    _logWindow?.AddLog(type, message);
                });
            }
        }

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            try
            {
                AddLog("INFO", "正在关闭应用程序...");
                
                // 1. 清理实时更新定时器（使用锁保护）
                lock (_realtimeTimerLock)
                {
                    if (_realtimeDebounceTimer != null)
                    {
                        try
                        {
                            _realtimeDebounceTimer.Dispose();
                        }
                        catch (ObjectDisposedException)
                        {
                            // 已经被释放，忽略
                        }
                        finally
                        {
                            _realtimeDebounceTimer = null;
                        }
                    }
                }
                
                // 2. 停止队列处理
                _isProcessingQueue = false;
                _messageQueue.Clear();
                
                // 3. 停止 HTTP 服务器
                StopHttpServer();
                
                // 4. 停止 VRC 监听器（内部已有锁保护）
                StopVrcListener();
                
                // 5. 关闭 OSC 客户端
                if (_oscClient != null)
                {
                    try
                    {
                        _oscClient.Close();
                        _oscClient.Dispose();
                    }
                    catch (ObjectDisposedException)
                    {
                        // 已经被释放，忽略
                    }
                    finally
                    {
                        _oscClient = null;
                    }
                }
                
                // 6. 清理 WebView2 资源（重要：防止子进程残留）
                try
                {
                    if (webView != null && webView.CoreWebView2 != null)
                    {
                        AddLog("INFO", "正在清理 WebView2 资源...");
                        
                        // 停止导航
                        webView.CoreWebView2.Stop();
                        
                        // 导航到空白页，释放当前页面资源
                        webView.CoreWebView2.Navigate("about:blank");
                        
                        // 等待一小段时间让导航完成
                        System.Threading.Thread.Sleep(100);
                        
                        // 释放 WebView2
                        webView.Dispose();
                        
                        AddLog("INFO", "WebView2 资源已清理");
                    }
                }
                catch (Exception ex)
                {
                    AddLog("ERROR", $"清理 WebView2 失败: {ex.Message}");
                }
                
                // 7. 关闭子窗口
                _settingsWindow?.Close();
                _logWindow?.Close();
                
                AddLog("INFO", "应用程序已安全关闭");
                
                // 给日志窗口一点时间显示最后的消息
                System.Threading.Thread.Sleep(100);
            }
            catch (Exception ex)
            {
                // 即使出错也要继续关闭
                Debug.WriteLine($"关闭时出错: {ex.Message}");
            }
            finally
            {
                base.OnClosing(e);
            }
        }
    }
    
    public class OscHistoryEntry
    {
        public string Time { get; set; } = "";
        public string Message { get; set; } = "";
    }
}