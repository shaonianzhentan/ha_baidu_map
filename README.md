# 百度地图
在HA里使用的百度地图，支持GPS定位轨迹显示

# 使用方式

```
# 使用内置密钥（有限额，最好自己申请密钥）
ha_baidu_map:

# 完整配置
# record: 要记录使用GPSLogger的设备
# map: hidden（侧边栏隐藏自带的地图）
ha_baidu_map:
  name: 百度地图
  icon: mdi:map-marker-radius
  ak: 百度地图AK密钥
  map: hidden
  record:
    - device_tracker.wo_de_shou_ji

```

## 在GPSLogger应用里的配置（其它参考官方文档）
```

# HTTP 内容
# 只能修改【我的手机】

latitude=%LAT&longitude=%LON&device=我的手机&accuracy=%ACC&battery=%BATT&speed=%SPD&direction=%DIR&altitude=%ALT&provider=%PROV&activity=%ACT-%DIST-%STARTTIMESTAMP

```

# 更新日志

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