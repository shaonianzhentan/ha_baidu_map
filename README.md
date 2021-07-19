# 百度地图
在HA里使用的百度地图，支持GPS定位轨迹显示

# 使用方式

> 不懂就看视频哈
- https://www.bilibili.com/video/BV1z54y1e7vE
- https://www.bilibili.com/video/BV1zD4y127vG

```
ha_baidu_map:
  ak: 百度地图【浏览器的浏览器的浏览器的AK密钥】 - 如果不会配置ak就把这行删掉，初次安装空白就刷新一下页面
```

## 在GPSLogger应用里的配置
```
http://IP:8123/ha_baidu_map-location-【自动生成的key】?entity_id=【实体ID】&latitude=%LAT&longitude=%LON&battery=%BATT&sts=%STARTTIMESTAMP

```

# 更新日志

### v2.4.3
- 修复地图点击后出现地点详情的问题
- 增加设备里的编码地理位置显示
- 隐藏百度地图版权信息
- 调整头部高度样式
- 支持集成添加

### v2.4
- 将百度HTTP协议改为HTTPS
- 移除隐藏默认地图功能
- 新增定位数据添加接口
- 修复不显示person实体的问题
- 更换实体名称
- 添加地图卡片
- 不是管理员也能显示百度地图侧边栏

### v2.3
- 修复图标不显示的问题
- 右上角新增编辑图标

### v2.2
- 修复在HA的APP中无法加载GPS轨迹的问题
- 解决移动端不能点击实体的问题

### v2.1
- 修复https下无法加载接口的问题

### v2.0
- 修改为本地json文件存储（文件在.storage/ha_baidu_map/）
- 支持多设备分类记录
- 修复设备多次重复记录问题
- 支持配置隐藏自带地图

### v1.0.5
- 修复菜单图标一直显示的问题

### v1.0.4（测试版）
- 加入数据库存储（目前只支持HA自带的数据库）
- 加入GPS运动轨迹显示

### v1.0
- 区域设置passive属性为true会自动隐藏（同官方地图）
- 设备设置hidden属性为true会自动隐藏（同官方地图）
- 修复更新坐标时，会出现重复的问题
- 修复多个区域无法加载的问题
- 修复头像和官方地图显示不一致的问题
- 加入区域可以点击查看的功能（这个官方没有）


## 如果这个项目对你有帮助，请我喝杯<del><small>咖啡</small></del><b>奶茶</b>吧😘
|支付宝|微信|
|---|---|
<img src="https://ha.jiluxinqing.com/img/alipay.png" align="left" height="160" width="160" alt="支付宝" title="支付宝">  |  <img src="https://ha.jiluxinqing.com/img/wechat.png" align="left" height="160" width="160" alt="微信支付" title="微信">