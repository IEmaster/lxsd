# 网站图标使用说明

## 图标文件命名规则

将网站图标文件放在此文件夹中，文件名应为网站域名（不包含www），支持以下格式：

- PNG (.png)
- JPG (.jpg)
- JPEG (.jpeg)
- ICO (.ico)
- SVG (.svg)

## 示例

- Google: `google.com.png`
- GitHub: `github.com.png`
- 百度: `baidu.com.png`
- Bilibili: `bilibili.com.png`

## 注意事项

1. 文件名必须与网站域名完全匹配（不区分大小写）
2. 建议图标尺寸为 24x24 或 32x32 像素
3. 如果没有找到对应图标，将使用 `default.png`
4. 系统会自动检测多种格式，优先级：png > jpg > jpeg > ico > svg

## 获取网站图标

你可以通过以下方式获取网站图标：

1. 访问网站的 `/favicon.ico` 路径
2. 使用在线图标提取工具
3. 从网站的源代码中查找图标链接
4. 使用浏览器开发者工具查看网站图标 