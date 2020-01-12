# 百度地图
在HA里使用的百度地图，支持GPS定位轨迹显示

# 使用方式

```
# 使用内置密钥（有限额，最好自己申请密钥）
ha_baidu_map:

# 完整配置
# api_key: 与【GPSLogger应用】通信的密钥（特定uuid格式）
ha_baidu_map:
  name: 百度地图
  icon: mdi:map-marker-radius
  ak: 百度地图AK密钥
  api_key: 29689819-3765-47f3-8528-2b1085f0dada

```

## 在GPSLogger应用里的配置（其它参考官方文档）
```

# HTTP 内容
# api_key: 百度地图HA组件里配置的api_key，必填项

{
  "api_key": "29689819-3765-47f3-8528-2b1085f0dada",
  "latitude": "%LAT",
  "longitude": "%LON",
  "device": "我的手机",
  "accuracy": "%ACC",
  "battery": "%BATT",
  "speed": "%SPD",
  "direction": "%DIR",
  "altitude": "%ALT",
  "provider": "%PROV",
  "activity": "%ACT",
  "starttimestamp": "%STARTTIMESTAMP",
  "dist": "%DIST"
}


# HTTP 头

Content-Type: application/json

# HTTP 方法

POST


```

# 更新日志

### v1.0.2
- 加入数据库存储（目前只支持HA自带的数据库）

### v1.0
- 区域设置passive属性为true会自动隐藏（同官方地图）
- 设备设置hidden属性为true会自动隐藏（同官方地图）
- 修复更新坐标时，会出现重复的问题
- 修复多个区域无法加载的问题
- 修复头像和官方地图显示不一致的问题
- 加入区域可以点击查看的功能（这个官方没有）