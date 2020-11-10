import os, time, re, uuid, logging, json, datetime
from homeassistant.helpers.event import track_time_interval, async_call_later
from homeassistant.components.http import HomeAssistantView
from homeassistant.helpers.network import get_url

from .api_storage import ApiStorage

_LOGGER = logging.getLogger(__name__)

DOMAIN = 'ha_baidu_map'
VERSION = '2.4'
URL = '/' + DOMAIN + '-api'
ROOT_PATH = '/' + DOMAIN + '-local/' + VERSION

def setup(hass, config):
    cfg  = config[DOMAIN]
    _name = cfg.get('name', '百度地图')
    _icon = cfg.get('icon', 'mdi:map-marker-radius')
    _ak = cfg.get("ak", 'hNT4WeW0AGvh2GuzuO92OfM6hCW25HhX')
    
    # 定位地址
    LOCATION_URL = '/' + DOMAIN + '-location-' + cfg.get('key', str(uuid.uuid4()).replace('-', ''))
        
    # 注册静态目录
    local = hass.config.path("custom_components/" + DOMAIN + "/local")
    if os.path.isdir(local):
        hass.http.register_static_path(ROOT_PATH, local, False)

    hass.components.frontend.add_extra_js_url(hass, ROOT_PATH + '/ha-panel-baidu-map.js')

    base_url = get_url(hass)
    hass.states.async_set('map.baidu', VERSION, {
        "icon": "mdi:map-marker-radius",
        "friendly_name": "百度地图",
        'api': 'https://api.map.baidu.com/getscript?v=3.0&ak=' + _ak,
        'location': base_url + LOCATION_URL + '?latitude=%LAT&longitude=%LON&battery=%BATT&sts=%STARTTIMESTAMP&entity_id=实体ID',
        '项目地址': 'https://github.com/shaonianzhentan/ha_baidu_map'
    })

    _LOGGER.info('''
-------------------------------------------------------------------

    百度地图【作者QQ：635147515】
    版本：''' + VERSION + '''
    定位地址：''' + base_url + LOCATION_URL + '''
    项目地址：https://github.com/shaonianzhentan/ha_baidu_map
    
-------------------------------------------------------------------''')

    hass.components.frontend.async_register_built_in_panel(
        "baidu-map",
        _name,
        _icon,
        frontend_url_path='ha_baidu_map',
        config={"ak": _ak, "url_path": ROOT_PATH},
        require_admin=False)

    hass.http.register_view(HassGateView)
    
    sql = ApiStorage(hass)
    hass.data[ROOT_PATH] = sql        
    # 记录信息
    class LocationGateView(HomeAssistantView):
        url = LOCATION_URL
        name = DOMAIN
        requires_auth = False

        async def get(self, request):
            hass = request.app["hass"]
            query = request.query
            print(query)
            try:
                entity_id = query['entity_id']
                latitude = query['latitude']
                longitude = query['longitude']
                battery = query.get('battery', 0)
                sts = query['sts']
                entity = hass.states.get(entity_id)
                if entity is not None and hasattr(entity, 'attributes'):
                    attributes = {
                        **entity.attributes,
                        'latitude': latitude,
                        'longitude': longitude,
                        'battery': battery,
                        'sts': sts,
                        'sts_date': timestamp_to_str(int(sts)),
                    }
                    hass.states.async_set(entity_id, entity.state, attributes)
                    # 存储定位信息
                    sql.add(entity_id, attributes)
                    return self.json({'code':0, 'msg': '定位发送成功'})
            except Exception as ex:
                print(ex)
                return self.json({'code':1, 'msg': '出现异常'})
    hass.http.register_view(LocationGateView)
    return True

# 获取信息
class HassGateView(HomeAssistantView):

    url = URL
    name = DOMAIN
    requires_auth = True
    
    async def post(self, request):
        hass = request.app["hass"]
        try:
            res = await request.json()

            sql = hass.data[ROOT_PATH]            
            if res['type'] == 'get_info':
                # 获取同一时刻的GPS记录，生成运动轨迹
                _list = sql.get_info(res['sts'])
                return self.json(_list)
            elif res['type'] == 'get_list':
                # 获取 有5条记录 的所有时刻
                _list = sql.get_list()
                return self.json(_list)
            # 删除某些时刻的运动轨迹
            # 删除所有数据
            return self.json(res)
        except Exception as e:
            print(e)
            return self.json({'code':1, 'msg': '出现异常'})

def timestamp_to_str(timestamp=None, format='%Y-%m-%d %H:%M:%S'):
    if timestamp:
        time_tuple = time.localtime(timestamp)  # 把时间戳转换成时间元祖
        result = time.strftime(format, time_tuple)  # 把时间元祖转换成格式化好的时间
        return result
    else:
        return time.strptime(format)