import json, os

class ApiConfig():

    def __init__(self, _dir):        
        if os.path.exists(_dir) == False:           
            os.mkdir(_dir) 
        self.dir = _dir

    def get_dirs(self, _path):
        file_name = os.listdir(_path)
        _list = []
        for file in file_name:
            abs_path = os.path.join(_path, file)
            if os.path.isdir(abs_path):
                fileinfo = os.stat(abs_path)
                _list.append({
                    'name': file,
                    'path': abs_path,
                    'size': fileinfo.st_size,
                    'size_name': self.format_byte(fileinfo.st_size),
                    'edit_time': fileinfo.st_mtime,
                })
        return _list

    def get_files(self, _path):
        file_name = os.listdir(_path)
        _list = []
        for file in file_name:
            abs_path = os.path.join(_path, file)
            if os.path.isfile(abs_path):
                fileinfo = os.stat(abs_path)
                _list.append({
                    'name': file,
                    'path': abs_path,
                    'size': fileinfo.st_size,
                    'size_name': self.format_byte(fileinfo.st_size),
                    'edit_time': fileinfo.st_mtime,
                })
        return _list

    # 格式化文件大小的函数
    def format_byte(self, number):
        for (scale, label) in [(1024*1024*1024, "GB"), (1024*1024,"MB"), (1024,"KB")]:
            if number >= scale:
                return "%.2f %s" %(number*1.0/scale,lable)
            elif number == 1:
                return "1字节"
            else:  #小于1字节
                byte = "%.2f" % (number or 0)
                return ((byte[:-3]) if byte.endswith(".00") else byte) + "字节"

    def get_path(self, name):
        return self.dir + '/' + name

    def read(self, name):
        fn = self.get_path(name)
        if os.path.isfile(fn):
            with open(fn,'r', encoding='utf-8') as f:
                content = json.load(f)
                return content
        return None

    def write(self, name, obj):
        with open(self.get_path(name), 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False)