import logging
from homeassistant.helpers.network import get_url
from .const import NAME, ICON, DOMAIN, VERSION, URL, ROOT_PATH

from .api_storage import ApiStorage
from .api_view import HassGateView, mouted_view

_LOGGER = logging.getLogger(__name__)

def setup(hass, config):
    # 没有配置和已经运行则不操作
    if DOMAIN not in config or DOMAIN in hass.data:
        return True
    
    cfg  = config[DOMAIN]
    ak = cfg.get("ak", "hNT4WeW0AGvh2GuzuO92OfM6hCW25HhX")
    hass.data[DOMAIN] = ApiStorage(hass)
    # 定位地址
    LOCATION_URL = '/' + DOMAIN + '-location-' + ak[0:5]
    # 绝对路径
    ABSOLUTE_LOCATION_URL = get_url(hass) + LOCATION_URL

    _LOGGER.info('''
-------------------------------------------------------------------

    百度地图【作者QQ：635147515】
    版本：''' + VERSION + '''
    定位地址：''' + ABSOLUTE_LOCATION_URL + '''
    项目地址：https://github.com/shaonianzhentan/ha_baidu_map
    
-------------------------------------------------------------------''')
    # 设置状态
    hass.states.async_set('map.baidu', VERSION, {
        "friendly_name": NAME, "icon": ICON,
        'api': 'https://api.map.baidu.com/getscript?v=3.0&ak=' + ak,
        'location':ABSOLUTE_LOCATION_URL + '?latitude=%LAT&longitude=%LON&battery=%BATT&sts=%STARTTIMESTAMP&entity_id=实体ID'
    })
    # 注册静态目录
    hass.http.register_static_path(ROOT_PATH, hass.config.path("custom_components/" + DOMAIN + "/local"), False)
    hass.components.frontend.add_extra_js_url(hass, ROOT_PATH + '/ha-panel-baidu-map.js')
    hass.components.frontend.async_register_built_in_panel(
        "baidu-map", NAME, ICON,
        frontend_url_path='ha_baidu_map',
        config={"ak": ak, "url_path": ROOT_PATH},
        require_admin=False)
    hass.http.register_view(HassGateView)
    mouted_view(hass, LOCATION_URL)
    return True

# 集成安装
async def async_setup_entry(hass, entry):
    setup(hass, { DOMAIN: entry.data })
    return True
