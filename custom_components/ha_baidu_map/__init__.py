import os
import uuid

DOMAIN = 'ha_baidu_map'
VERSION = '1.0'
URL = '/ha_baidu_map-api-'+ str(uuid.uuid4())
ROOT_PATH = URL + '/' + VERSION

def setup(hass, config):
    cfg  = config[DOMAIN]
    # 注册静态目录
    local = hass.config.path("custom_components/ha_baidu_map/local")
    if os.path.isdir(local):
        hass.http.register_static_path(ROOT_PATH, local, False)

    hass.components.frontend.add_extra_js_url(hass, ROOT_PATH + '/ha-panel-baidu-map.js')

    frontend_url_path = cfg.get('path', 'ha_baidu_map')
    _name = cfg.get('name', '百度地图')
    _icon = cfg.get('icon', 'mdi:map-marker-radius')
    _map_ak = config.get("map_ak", 'ha_cloud_music')

    hass.components.frontend.async_register_built_in_panel(
        "baidu-map",
        _name,
        _icon,
        frontend_url_path,
        config={"ak": _map_ak},
        require_admin=True)

    return True