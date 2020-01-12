import os
import re
import uuid
import logging
import json
from homeassistant.components.http import HomeAssistantView
import sqlalchemy
from sqlalchemy.orm import scoped_session, sessionmaker
from homeassistant.components.recorder import CONF_DB_URL, DEFAULT_DB_FILE, DEFAULT_URL

_LOGGER = logging.getLogger(__name__)

DOMAIN = 'ha_baidu_map'
VERSION = '1.0.2'
URL = '/ha_baidu_map-api'
ROOT_PATH = URL + '/' + VERSION
API_KEY = str(uuid.uuid4())

def setup(hass, config):
    cfg  = config[DOMAIN]
    _name = cfg.get('name', '百度地图')
    _icon = cfg.get('icon', 'mdi:map-marker-radius')
    _ak = cfg.get("ak", 'ha_cloud_music')
     # 验证api_key是否设置为uuid格式（为了安全，必须要这么做）
    _api_key = cfg.get('api_key', '')
    global API_KEY
    if _api_key != '' and re.match('\w{8}(-\w{4}){3}-\w{12}', _api_key):
        _LOGGER.info('【百度地图】使用自定义api_key：' + _api_key)
        API_KEY = _api_key
    
    # 注册静态目录
    local = hass.config.path("custom_components/ha_baidu_map/local")
    if os.path.isdir(local):
        hass.http.register_static_path(ROOT_PATH, local, False)

    hass.components.frontend.add_extra_js_url(hass, ROOT_PATH + '/ha-panel-baidu-map.js')

    _LOGGER.info('''
-------------------------------------------------------------------

    百度地图【作者QQ：635147515】
    版本：''' + VERSION + '''    
    项目地址：https://github.com/shaonianzhentan/ha_baidu_map
    安装信息：
    
        通信URL：''' + hass.config.api.base_url + URL + '''
        
        通信密钥：''' + API_KEY + '''
    
-------------------------------------------------------------------''')

    hass.components.frontend.async_register_built_in_panel(
        "baidu-map",
        _name,
        _icon,
        frontend_url_path='ha_baidu_map',
        config={"ak": _ak},
        require_admin=True)

    hass.http.register_view(HassGateView)
    
    hass.data[URL] = SqlLite(hass)
    
    
    
    return True

class HassGateView(HomeAssistantView):

    url = URL
    name = DOMAIN
    requires_auth = False
    
    async def post(self, request):
        hass = request.app["hass"]
        try:
            res = await request.json()  
            _LOGGER.info(res)            
            if 'api_key' not in res:
                _LOGGER.info('密钥不存在')
                return self.json({'code':1, 'msg': '密钥不存在'})
            
            if res['api_key'] != API_KEY:
                _LOGGER.info('密钥错误')
                return self.json({'code':1, 'msg': '密钥错误'})

            if 'latitude' not in res and 'latitude' not in res and 'longitude' not in res and 'device' not in res:
                _LOGGER.info('参数不对')
                return self.json({'code':1, 'msg': '参数不对'})
                
            if 'accuracy' not in res:
                res['accuracy'] = ''
            if 'battery' not in res:
                res['battery'] = ''
            if 'speed' not in res:
                res['speed'] = ''
            if 'direction' not in res:
                res['direction'] = ''
            if 'altitude' not in res:
                res['altitude'] = ''
            if 'activity' not in res:
                res['activity'] = ''
            if 'provider' not in res:
                res['provider'] = ''
            if 'starttimestamp' not in res:
                res['starttimestamp'] = ''
            if 'dist' not in res:
                res['dist'] = ''
                
            sql = hass.data[URL]
            sql.add(res)

            '''
            sql.add({
                'latitude':126.123123123,
                'longitude':148.234234234234234,
                'device':'我的设备',
                'accuracy':'精确',
                'battery':'电量',
                'speed':'速度',
                'direction':'方向',
                'altitude':'海拔高度',
                'provider':'供应商',
                'activity':'活动'
            })
            '''
            return self.json(res)
        except Exception as e:
            print(e)
            return self.json({'code':1, 'msg': '出现异常'})
            
class SqlLite():
    
    def __init__(self, hass, db_url=None):
        try:
            if not db_url:
                db_url = DEFAULT_URL.format(hass_config_path=hass.config.path(DEFAULT_DB_FILE))
                
            engine = sqlalchemy.create_engine(db_url)
            self.sessmaker = scoped_session(sessionmaker(bind=engine))
            # 初始化表
            self.init_db()
        except sqlalchemy.exc.SQLAlchemyError as err:
            _LOGGER.error("Couldn't connect using %s DB_URL: %s", db_url, err)
    
    def init_db(self):
        _rows = self.query("SELECT COUNT(*) as a FROM sqlite_master where type='table' and name='ha_baidu_map'")
        # 如果表不存在，则创建
        if _rows[0]['a'] == 0:
            self.execute('''
                CREATE TABLE ha_baidu_map(
                    id integer PRIMARY KEY autoincrement,
                    latitude double,
                    longitude double,
                    device text,
                    accuracy text,
                    battery text,
                    speed text,
                    direction text,
                    altitude text,
                    provider text,
                    activity text,
                    starttimestamp int,
                    dist text,
                    cdate datetime default (datetime('now', 'localtime'))
                )
            ''')
            self.execute('''
                CREATE INDEX ha_baidu_map_index_id ON ha_baidu_map(id);
            ''')
    
    # 把单引号过滤掉，避免SQL注入
    def filter(self, value):
        return str(value).replace("'","")
    
    def execute(self, sql, func=None):
        try:
            # Run a dummy query just to test the db_url
            sess = self.sessmaker()
            _LOGGER.info(sql)
            result = sess.execute(sql)
            
            if func != None:
                func(sess)
                
            return result
        except sqlalchemy.exc.SQLAlchemyError as err:
            _LOGGER.error("出现异常: %s", err)
            return None
        finally:
            sess.close()
    
    def query(self, sql):
        try:            
            # Run a dummy query just to test the db_url
            sess = self.sessmaker()
            _LOGGER.info(sql)
            result = sess.execute(sql)
            d, a = {}, [] 
            for rowproxy in result:
                for tup in rowproxy.items():
                    d = {**d, **{tup[0]: tup[1]}}
                    a.append(d)
            _LOGGER.info(a)
            return a
        except sqlalchemy.exc.SQLAlchemyError as err:
            _LOGGER.error("出现异常: %s", err)
            return None
        finally:
            sess.close()
            
    def add(self, gps_info):
        self.execute("""
        insert into ha_baidu_map(latitude,longitude,device,accuracy,battery,speed,direction,altitude,provider,activity,starttimestamp,dist) values('""" 
        + self.filter(gps_info['latitude']) + """','""" + self.filter(gps_info['longitude']) + """','""" 
        + self.filter(gps_info['device']) + """','""" + self.filter(gps_info['accuracy']) + """','""" 
        + self.filter(gps_info['battery']) + """','""" + self.filter(gps_info['speed']) + """','""" 
        + self.filter(gps_info['direction']) + """','""" + self.filter(gps_info['altitude']) + """','""" 
        + self.filter(gps_info['provider']) + """','""" + self.filter(gps_info['activity']) + """','""" 
        + self.filter(gps_info['starttimestamp']) + """','""" + self.filter(gps_info['dist']) + """')
        """, lambda sess: sess.commit())