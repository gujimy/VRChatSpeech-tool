using System;
using System.Collections.ObjectModel;
using System.Text;
using System.Windows;

namespace VRChatSpeechAssistant
{
    public partial class LogWindow : Window
    {
        public ObservableCollection<LogEntry> LogEntries { get; } = new ObservableCollection<LogEntry>();
        private const int MaxLogEntries = 500;

        public LogWindow()
        {
            InitializeComponent();
            LogList.ItemsSource = LogEntries;
        }

        public void AddLog(string type, string message)
        {
            Dispatcher.Invoke(() =>
            {
                // 添加新日志到顶部
                LogEntries.Insert(0, new LogEntry
                {
                    Time = DateTime.Now.ToString("HH:mm:ss"),
                    Type = type,
                    Message = message
                });

                // 限制日志数量
                while (LogEntries.Count > MaxLogEntries)
                {
                    LogEntries.RemoveAt(LogEntries.Count - 1);
                }

                // 更新计数
                TxtLogCount.Text = $"（{LogEntries.Count} 条）";
            });
        }

        private void BtnClear_Click(object sender, RoutedEventArgs e)
        {
            LogEntries.Clear();
            TxtLogCount.Text = "（0 条）";
        }

        private void BtnCopy_Click(object sender, RoutedEventArgs e)
        {
            var sb = new StringBuilder();
            foreach (var entry in LogEntries)
            {
                sb.AppendLine($"[{entry.Time}] [{entry.Type}] {entry.Message}");
            }
            
            if (sb.Length > 0)
            {
                Clipboard.SetText(sb.ToString());
                MessageBox.Show("日志已复制到剪贴板", "提示", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            // 隐藏而不是关闭，以便保留日志
            e.Cancel = true;
            Hide();
        }
    }

    public class LogEntry
    {
        public string Time { get; set; } = "";
        public string Type { get; set; } = "";
        public string Message { get; set; } = "";
    }
}