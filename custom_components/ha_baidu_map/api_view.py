
import time
from homeassistant.components.http import HomeAssistantView
from .const import DOMAIN, URL


def timestamp_to_str(timestamp=None, format='%Y-%m-%d %H:%M:%S'):
    if timestamp:
        time_tuple = time.localtime(timestamp)  # 把时间戳转换成时间元祖
        result = time.strftime(format, time_tuple)  # 把时间元祖转换成格式化好的时间
        return result
    else:
        return time.strptime(format)

# 获取信息
class HassGateView(HomeAssistantView):

    url = URL
    name = DOMAIN
    requires_auth = True
    
    async def post(self, request):
        hass = request.app["hass"]
        try:
            res = await request.json()

            sql = hass.data[DOMAIN]            
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

# 安装网关
def mouted_view(hass, LOCATION_URL):
    # 记录信息
    class LocationGateView(HomeAssistantView):
        url = LOCATION_URL
        name = DOMAIN
        requires_auth = False

        async def get(self, request):
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
