using System.Windows;

namespace VRChatSpeechAssistant
{
    public partial class SettingsWindow : Window
    {
        public SettingsWindow()
        {
            InitializeComponent();
            LoadSettings();
        }

        private void LoadSettings()
        {
            TxtOscIp.Text = Properties.Settings.Default.OscIp;
            TxtOscPort.Text = Properties.Settings.Default.OscPort.ToString();
            TxtListenPort.Text = Properties.Settings.Default.ListenPort.ToString();
            TxtHttpPort.Text = Properties.Settings.Default.HttpPort.ToString();
            ChkOscEnabled.IsChecked = Properties.Settings.Default.OscEnabled;
            ChkVrcSync.IsChecked = Properties.Settings.Default.VrcSyncEnabled;
        }

        private void BtnSave_Click(object sender, RoutedEventArgs e)
        {
            // 保存 OSC IP
            Properties.Settings.Default.OscIp = TxtOscIp.Text;

            // 保存 OSC 端口
            if (int.TryParse(TxtOscPort.Text, out int oscPort) && oscPort > 0 && oscPort < 65536)
            {
                Properties.Settings.Default.OscPort = oscPort;
            }
            else
            {
                MessageBox.Show("请输入有效的 OSC 端口号 (1-65535)", "输入错误", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // 保存监听端口
            if (int.TryParse(TxtListenPort.Text, out int listenPort) && listenPort > 0 && listenPort < 65536)
            {
                Properties.Settings.Default.ListenPort = listenPort;
            }
            else
            {
                MessageBox.Show("请输入有效的监听端口号 (1-65535)", "输入错误", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // 保存 HTTP 端口
            if (int.TryParse(TxtHttpPort.Text, out int httpPort) && httpPort > 0 && httpPort < 65536)
            {
                Properties.Settings.Default.HttpPort = httpPort;
            }
            else
            {
                MessageBox.Show("请输入有效的 HTTP 端口号 (1-65535)", "输入错误", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // 保存其他设置
            Properties.Settings.Default.OscEnabled = ChkOscEnabled.IsChecked ?? false;
            Properties.Settings.Default.VrcSyncEnabled = ChkVrcSync.IsChecked ?? false;

            // 持久化保存
            Properties.Settings.Default.Save();

            // 通知主窗口设置已更新
            if (Owner is MainWindow mainWindow)
            {
                mainWindow.ReloadSettings();
            }

            DialogResult = true;
            Close();
        }
    }
}