# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Chọn kênh phần mềm ổn định
  channel = "stable-24.05"; 

  # Cài đặt các công cụ cần thiết (Đã bỏ dấu # để kích hoạt)
  packages = [
    pkgs.nodejs_20              # Cái này quan trọng nhất: Node.js bản 20
    pkgs.nodePackages.nodemon   # Tự động restart server khi ông sửa code
    pkgs.mongosh                # Công cụ test kết nối MongoDB từ Terminal (Dự phòng)
  ];

  # Biến môi trường
  env = {};

  # Cấu hình cho IDX và VS Code
  idx = {
    # Cài sẵn mấy Extension xịn cho ông đỡ phải tìm
    extensions = [
      "dbaeumer.vscode-eslint"  # Soi lỗi chính tả code
      "esbenp.prettier-vscode"  # Tự động format code cho đẹp
      "formulahendry.auto-close-tag" # Tự đóng thẻ HTML </div>
    ];

    # Cấu hình Web Preview (Cái ông vừa thêm)
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "start"];
          manager = "web";
          env = {
            PORT = "3000";
          };
        };
      };
    };
  };
}