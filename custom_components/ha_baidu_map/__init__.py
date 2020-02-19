import os, time, re, uuid, logging, json, datetime
from homeassistant.helpers.event import track_time_interval, async_call_later
from homeassistant.components.http import HomeAssistantView

from .api_storage import ApiStorage

_LOGGER = logging.getLogger(__name__)

DOMAIN = 'ha_baidu_map'
VERSION = '2.2'
URL = '/' + DOMAIN + '-api'
ROOT_PATH = '/' + DOMAIN + '-local/' + VERSION
# 定时器时间
TIME_BETWEEN_UPDATES = datetime.timedelta(seconds=3)

def setup(hass, config):
    cfg  = config[DOMAIN]
    _name = cfg.get('name', '百度地图')
    _icon = cfg.get('icon', 'mdi:map-marker-radius')
    _ak = cfg.get("ak", 'ha_cloud_music')
    record = cfg.get('record', [])
    map_hidden = cfg.get('map', '')
        
    # 注册静态目录
    local = hass.config.path("custom_components/" + DOMAIN + "/local")
    if os.path.isdir(local):
        hass.http.register_static_path(ROOT_PATH, local, False)

    hass.components.frontend.add_extra_js_url(hass, ROOT_PATH + '/ha-panel-baidu-map.js')
    
    _LOGGER.info('''
-------------------------------------------------------------------

    百度地图【作者QQ：635147515】
    版本：''' + VERSION + '''    
    项目地址：https://github.com/shaonianzhentan/ha_baidu_map
    
-------------------------------------------------------------------''')

    hass.components.frontend.async_register_built_in_panel(
        "baidu-map",
        _name,
        _icon,
        frontend_url_path='ha_baidu_map',
        config={"ak": _ak, "url_path": ROOT_PATH},
        require_admin=True)

    hass.http.register_view(HassGateView)
    
    sql = ApiStorage(hass)
    hass.data[ROOT_PATH] = sql
    
    # 定时器
    def interval(now):
        # 隐藏原始地图
        if map_hidden == 'hidden':
            DATA_PANELS = 'frontend_panels'
            panel = hass.data.get(DATA_PANELS, {})
            if 'map' in panel:
                hass.components.frontend.async_remove_panel("map")
                print('删除自带地图')
                
        # 读取设备信息
        for key in record:
            state = hass.states.get(key)
            # 判断是否为空
            if state is None:
                continue
            # 判断是否包含 属性对象
            if hasattr(state, 'attributes') == False:
                continue
            attr =  dict(state.attributes)
            if 'activity' not in attr:
                continue
            arr = attr['activity'].split('-')
            # 如果是特定格式，则添加数据
            if  len(arr) == 3:
                # 如果经纬度不一样，则记录
                # _LOGGER.info(state)
                # attr['latitude']
                # attr['longitude']
                # attr['friendly_name']            
                # attr['gps_accuracy']    
                # attr['battery_level']
                attr['activity'] = arr[0]
                attr['dist'] = arr[1]
                attr['starttimestamp'] = arr[2]
                attr['cdate'] = time.strftime('%Y-%m-%d %H:%M:%S',time.localtime(time.time()))
                sql.add(key, attr)

    track_time_interval(hass, interval, TIME_BETWEEN_UPDATES)    
        
    return True

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