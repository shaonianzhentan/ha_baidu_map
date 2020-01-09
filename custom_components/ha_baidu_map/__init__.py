import os
import uuid
import logging

_LOGGER = logging.getLogger(__name__)

DOMAIN = 'ha_baidu_map'
VERSION = '1.0.1'
URL = '/ha_baidu_map-api-'+ str(uuid.uuid4())
ROOT_PATH = URL + '/' + VERSION

def setup(hass, config):
    cfg  = config[DOMAIN]
    # 注册静态目录
    local = hass.config.path("custom_components/ha_baidu_map/local")
    if os.path.isdir(local):
        hass.http.register_static_path(ROOT_PATH, local, False)

    hass.components.frontend.add_extra_js_url(hass, ROOT_PATH + '/ha-panel-baidu-map.js')

    _name = cfg.get('name', '百度地图')
    _icon = cfg.get('icon', 'mdi:map-marker-radius')
    _ak = config.get("ak", 'ha_cloud_music')

    _LOGGER.info('''
-------------------------------------------------------------------

    百度地图【作者QQ：635147515】
    版本：''' + VERSION + '''    
    项目地址：https://github.com/shaonianzhentan/ha_baidu_map
    安装信息：
        通信地址：''' + URL + '''
    
-------------------------------------------------------------------''')

    hass.components.frontend.async_register_built_in_panel(
        "baidu-map",
        _name,
        _icon,
        frontend_url_path='ha_baidu_map',
        config={"ak": _ak},
        require_admin=True)

    hass.http.register_view(HassGateView)
    return True

class HassGateView(HomeAssistantView):

    url = URL
    name = DOMAIN
    requires_auth = False
    
    async def post(self, request):
        hass = request.app["hass"]
        try:
            reader = await request.multipart()
            file = await reader.next()
            # 生成文件
            filename = os.path.dirname(__file__) + '/' + str(uuid.uuid4())+ '.json'
            size = 0
            with open(filename, 'wb') as f:
                while True:
                    chunk = await file.read_chunk()  # 默认是8192个字节。
                    if not chunk:
                        break
                    size += len(chunk)
                    f.write(chunk)
        
            return self.json({'code':1, 'msg': '百度语音识别错误'})            
        except Exception as e:
            print(e)
            return self.json({'code':1, 'msg': '出现异常'})