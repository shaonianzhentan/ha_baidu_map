import time, os
from .api_config import ApiConfig

class ApiStorage():

    def __init__(self, hass):
        self.hass = hass
        self.cache_dir = './.storage/ha_baidu_map'
        # 初始化文件夹
        self.cfg = ApiConfig(hass.config.path(self.cache_dir))

    # 获取所有列表信息
    def get_list(self):
        _path = self.hass.config.path(self.cache_dir)
        _list = []
        dirs = self.cfg.get_dirs(_path)
        for dir in dirs:
            # state = hass.states.get('device_tracker.' + dir['name'])
            _list.append({'list': [], 'name': dir['name']})
            lastIndex = len(_list) - 1
            files = self.cfg.get_files(dir['path'])
            for file in files:
                # 小于2kb数据直接丢弃
                if file['size'] < 2048:                    
                    continue
                _name = file['name'].replace('.json', '')
                _list[lastIndex]['list'].append({'sts': _name, 'cdate': time.strftime('%Y-%m-%d %H:%M:%S',time.localtime(int(_name)))})
        
        return _list

    # 获取数据信息
    def get_info(self, name):
        _list = self.cfg.read(name + '.json')
        if _list == None:
            _list = []
        return _list

    # 添加数据
    def add(self, entity_id, gps_info):
        _dir_name = entity_id.split('.')[1]
        _dir = self.hass.config.path(self.cache_dir + '/' + _dir_name)
        if os.path.exists(_dir) == False:           
            os.mkdir(_dir) 
        sts_name = _dir_name + '/' + gps_info['starttimestamp'] + '.json'
        _list = self.cfg.read(sts_name)
        if _list == None:
            _list = []
        
        # 如果本次传入的数据，与最后一次一样，则不记录
        _len = len(_list)
        if  _len > 0:
            attr = _list[_len-1]
            if attr['latitude'] == gps_info['latitude'] and attr['longitude'] == gps_info['longitude']:
                return

        # 添加数据
        _list.append(gps_info)
        # 写入数据
        self.cfg.write(sts_name, _list)
