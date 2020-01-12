import os
import re
import uuid
import logging
import json
import datetime
from homeassistant.helpers.event import track_time_interval, async_call_later
from homeassistant.components.http import HomeAssistantView
import sqlalchemy
from sqlalchemy.orm import scoped_session, sessionmaker
from homeassistant.components.recorder import CONF_DB_URL, DEFAULT_DB_FILE, DEFAULT_URL

_LOGGER = logging.getLogger(__name__)

DOMAIN = 'ha_baidu_map'
VERSION = '1.0.3'
URL = '/ha_baidu_map-api'
ROOT_PATH = URL + '/' + VERSION
API_KEY = str(uuid.uuid4())
# 定时器时间
TIME_BETWEEN_UPDATES = datetime.timedelta(seconds=3)

device_list = {}

def setup(hass, config):
    cfg  = config[DOMAIN]
    _name = cfg.get('name', '百度地图')
    _icon = cfg.get('icon', 'mdi:map-marker-radius')
    _ak = cfg.get("ak", 'ha_cloud_music')
    record = cfg.get('record', [])
    
    global device_list
    for item in record:
      device_list[item] = {
        'latitude': 0,
        'longitude': 0
      }
    
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
    
-------------------------------------------------------------------''')

    hass.components.frontend.async_register_built_in_panel(
        "baidu-map",
        _name,
        _icon,
        frontend_url_path='ha_baidu_map',
        config={"ak": _ak},
        require_admin=True)

    hass.http.register_view(HassGateView)
    
    sql = SqlLite(hass)
    hass.data[URL] = sql
    
    # 定时器
    def interval(now):
        # 读取设备信息
        global device_list
        for key in device_list:
            state = hass.states.get(key)
            attr =  dict(state.attributes)
            if 'activity' not in attr:
                continue
            arr = attr['activity'].split('-')
            prev = device_list[key]
            if  len(arr) == 3 and (prev['latitude'] != attr['latitude'] or prev['longitude'] !=  attr['longitude']):
                # 如果经纬度不一样，则记录
                _LOGGER.info(state)
                device_list[key]['latitude'] = attr['latitude']
                device_list[key]['longitude'] = attr['longitude']
                attr['device'] = attr['friendly_name']            
                attr['accuracy'] = attr['gps_accuracy']    
                attr['battery'] = attr['battery_level']
                attr['activity'] = arr[0]
                attr['dist'] = arr[1]
                attr['starttimestamp'] = arr[2]
                sql.add(attr)

    track_time_interval(hass, interval, TIME_BETWEEN_UPDATES)    
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
            sql = hass.data[URL]
            
            if res['type'] == 'get_list':
                # 获取同一时刻的GPS记录，生成运动轨迹
                _list = sql.query("select * from ha_baidu_map where starttimestamp = '" + sql.filter(res['sts']) 
                + "' order by cdate asc")
                return self.json(_list)
            elif res['type'] == 'get_sts':
                # 获取 有5条记录 的所有时刻
                _list = sql.query("""
                    select datetime(starttimestamp, 'unixepoch', 'localtime') as cdate,starttimestamp as sts,count(starttimestamp) as c 
                    from ha_baidu_map group by starttimestamp 
                    having count(starttimestamp) >= 5 order by starttimestamp desc
                """)
                return self.json(_list)
            # 删除某些时刻的运动轨迹
            # 删除所有数据
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
            _LOGGER.debug(a)
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