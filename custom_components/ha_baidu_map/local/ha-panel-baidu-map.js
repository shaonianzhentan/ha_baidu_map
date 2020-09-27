function rad(d) {
    return d * Math.PI / 180.0;
}
// 根据经纬度计算距离，参数分别为第一点的纬度，经度；第二点的纬度，经度
function getDistance(lat1, lng1, lat2, lng2) {

    var radLat1 = rad(lat1);
    var radLat2 = rad(lat2);
    var a = radLat1 - radLat2;
    var b = rad(lng1) - rad(lng2);
    var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    s = s * 6378.137; // EARTH_RADIUS;
    s = Math.round(s * 10000) / 10000; //输出为公里

    var distance = s;
    var distance_str = "";

    if (parseInt(distance) >= 1) {
        distance_str = distance.toFixed(1) + "km";
    } else {
        distance_str = distance * 1000 + "m";
    }

    //s=s.toFixed(4);

    console.info('lyj 距离是', s);
    console.info('lyj 距离是', distance_str);
    //return s;
    return distance_str
}

class HaPanelBaiduMap extends HTMLElement {
    constructor() {
        super()
        const shadow = this.attachShadow({ mode: 'open' });
        const div = document.createElement('div', { 'class': 'root' });
        div.innerHTML = `
    <app-toolbar>
    </app-toolbar>
    <div id="baidu-map"></div>
    <iframe id="gps" class="hide"></iframe>
    
    <style>			
         app-header, app-toolbar {
            background-color: var(--primary-color);
            font-weight: 400;
            color: var(--text-primary-color, white);
        }
        #baidu-map{width:100%;height:calc(100vh - 64px); z-index: 0;}
        .right-action-panel{text-align:center;}
        .select-device{padding:2px 0 5px 10px;border:none;max-width:100px;font-size:12px;text-align:center;line-height:23px;background: transparent;}
        .device-marker{
          position:absolute;
          vertical-align: top;
          display: block;
          margin: 0 auto;
          width: 2.5em;
          text-align: center;
          height: 2.5em;
          line-height: 2.5em;
          font-size: 1.5em;
          border-radius: 50%;
          border: 0.1em solid var(--primary-color);
          color: rgb(76, 76, 76);
          background-color: white;
        }
        .hide{display:none;}
    #gps{width:100%;height:100vh;border:none;position:absolute;top:0;background:white;}
    </style>
`

        shadow.appendChild(div)
        this.shadow = shadow
        this.$ = shadow.querySelector.bind(shadow)
    }

    ready() {
        if (window.BMap) {
            // 添加标题
            let toolbar = this.shadow.querySelector('app-toolbar')
            if (toolbar.children.length === 0) {
                // console.log(window.BMap)
                // console.log('%O',this)
                // console.log('%O',toolbar)              
                top.ha_hass = this.hass
                // 添加菜单
                let menuButton = document.createElement('ha-menu-button')
                menuButton.hass = this.hass
                menuButton.narrow = true
                toolbar.appendChild(menuButton)
                // 添加标题
                let title = document.createElement('div')
                title.setAttribute('main-title', '')
                title.textContent = '百度地图'
                toolbar.appendChild(title)
                // 添加编辑图标
                let haIconButton = document.createElement('ha-icon-button')
                haIconButton.setAttribute('icon', 'hass:pencil')
                haIconButton.setAttribute('title', '编辑位置')
                haIconButton.onclick = () => {
                    history.pushState(null, null, '/config/zone')
                    this.fire('location-changed')
                }
                toolbar.appendChild(haIconButton)
                // 添加运动轨迹图标
                let haIconButton2 = document.createElement('ha-icon-button')
                haIconButton2.setAttribute('icon', 'mdi:crosshairs-gps')
                haIconButton2.setAttribute('title', 'GPS运动轨迹')
                haIconButton2.onclick = () => {
                    let gg = this.$('#gps')
                    gg.src = `${this.url_path}/travel.html?r=${Date.now()}`
                    gg.classList.toggle('hide')
                }
                toolbar.appendChild(haIconButton2)
                // 添加人员图标
                let haIconButton3 = document.createElement('ha-icon-button')
                haIconButton3.setAttribute('icon', 'mdi:account-outline')
                haIconButton3.setAttribute('title', '定位设备')
                haIconButton3.onclick = () => {
                    let dialog = document.createElement('div')
                    // 生成遮罩
                    let mask = document.createElement('div')
                    mask.style = 'height:100vh;width:100vw;position:fixed;top:0;left:0;background:rgba(0,0,0,.5);'
                    dialog.appendChild(mask)

                    let fm = document.createDocumentFragment()
                    // 生成标题
                    let title = document.createElement('div')
                    title.style = `text-align: right; padding: 15px;`
                    title.innerHTML = `<ha-icon icon="mdi:close-circle-outline" style="color: var(--primary-color); --mdc-icon-size: 30px;"></ha-icon>`
                    title.onclick = () => {
                        dialog.remove()
                    }
                    fm.appendChild(title)
                    // 生成设备表格
                    let table = document.createElement('table')
                    table.border = true
                    table.style = 'width:90%;border-spacing: 1px;text-align:left; border-collapse: collapse;margin: 0 auto;'
                    table.borderSpacing = 10
                    let tr = document.createElement('tr')
                    tr.innerHTML = `
                        <th>实体ID</th>
                        <th>设备</th>
                        <th>距离</th>
                        <th style="text-align:center;">操作</th>`
                    table.appendChild(tr)

                    let states = this.hass.states
                    console.log()
                    // 获取家的坐标
                    let homeAttr = states['zone.home']['attributes']
                    let homelatitude = homeAttr['latitude']
                    let homelongitude = homeAttr['longitude']
                    // 获取所有定位设备
                    let keys = Object.keys(states).filter(ele => ['device_tracker', 'zone', 'person'].includes(ele.split('.')[0]))
                    keys.forEach(key => {
                        let stateObj = states[key]
                        let attr = stateObj.attributes
                        if ('longitude' in attr && 'latitude' in attr) {
                            let { longitude, latitude } = attr
                            tr = document.createElement('tr')
                            let valueArr = [key, attr.friendly_name, getDistance(latitude, longitude, homelatitude, homelongitude)]
                            valueArr.forEach(value => {
                                let td = document.createElement('td')
                                td.textContent = value
                                tr.appendChild(td)
                            })
                            // 操作
                            let td = document.createElement('td')
                            td.textContent = '选择'
                            td.style = 'cursor:pointer; text-align:center;'
                            td.onclick = () => {
                                this.translate({ longitude, latitude }).then(res => {
                                    map.centerAndZoom(res[0], 18);
                                })
                                dialog.remove()
                            }
                            tr.appendChild(td)
                            table.appendChild(tr)
                        }
                    })
                    fm.appendChild(table)

                    let panel = document.createElement('div')
                    panel.style = `height:80vh;width:80vw;left:10vw;top:10vh;position:absolute;background:white;overflow:auto;`
                    panel.appendChild(fm)
                    dialog.appendChild(panel)

                    document.body.appendChild(dialog)
                }
                toolbar.appendChild(haIconButton3)

                // 获取当前HA配置的经纬度
                let { latitude, longitude } = this.hass.config
                // 生成一个对象
                var map = new BMap.Map(this.shadow.querySelector('#baidu-map'));
                this.map = map
                //添加地图类型控件
                map.addControl(new BMap.MapTypeControl({
                    mapTypes: [
                        BMAP_NORMAL_MAP,
                        BMAP_HYBRID_MAP
                    ]
                }))
                // 启用鼠标滚轮缩放
                map.enableScrollWheelZoom();

                // this.actionPanel()

                this.translate({ longitude, latitude }).then(res => {
                    let mPoint = res[0]
                    // 中心点
                    map.centerAndZoom(mPoint, 18);
                })

                this.loadZone()
                //this.update()
                /*
                var top_left_control = new BMap.ScaleControl({anchor: BMAP_ANCHOR_TOP_LEFT});// 左上角，添加比例尺
                var top_left_navigation = new BMap.NavigationControl();  //左上角，添加默认缩放平移控件
                var top_right_navigation = new BMap.NavigationControl({anchor: BMAP_ANCHOR_TOP_RIGHT, type: BMAP_NAVIGATION_CONTROL_SMALL}); //右上角，仅包含平移和缩放按钮
                mp.addControl(top_left_control);        
                mp.addControl(top_left_navigation);     
                mp.addControl(top_right_navigation);    
                */
                //触摸事件(解决点击事件无效)--触摸开始，开启拖拽
                map.addEventListener('touchmove', function (e) {
                    map.enableDragging();
                });
                //触摸结束始，禁止拖拽
                map.addEventListener("touchend", function (e) {
                    map.disableDragging();
                });
            } else {
                this.loadDevice()
            }
        }
    }

    /**************************** 加载区域 ********************************/

    // 添加Icon标记
    addIconMarker(point, icon, key) {
        let _this = this
        const map = this.map
        // 复杂的自定义覆盖物
        function ComplexCustomOverlay() { }

        ComplexCustomOverlay.prototype = new BMap.Overlay();
        ComplexCustomOverlay.prototype.initialize = function (map) {
            this._map = map;
            var div = this._div = document.createElement("div");
            div.style.position = "absolute";
            div.style.zIndex = BMap.Overlay.getZIndex(point.lat);
            div.style.MozUserSelect = "none";
            div.innerHTML = `<ha-icon icon="${icon}"></ha-icon>`
            map.getPanes().labelPane.appendChild(div);
            div.onclick = function () {
                _this.fire('hass-more-info', { entityId: key })
            }
            return div;
        }
        ComplexCustomOverlay.prototype.draw = function () {
            var pixel = map.pointToOverlayPixel(point);
            this._div.style.left = pixel.x - 12 + "px";
            this._div.style.top = pixel.y - 12 + "px";
        }
        var myCompOverlay = new ComplexCustomOverlay();

        map.addOverlay(myCompOverlay);
    }

    //加载区域
    loadZone() {
        let map = this.map
        this.debounce(async () => {
            // 这里添加设备
            let states = this.hass.states
            let keys = Object.keys(states).filter(ele => ele.indexOf('zone') === 0)
            for (let key of keys) {
                let stateObj = states[key]
                let attr = stateObj.attributes
                // 如果有经纬度，并且不在家，则标记
                if (!attr['passive'] && 'longitude' in attr && 'latitude' in attr) {
                    let res = await this.translate({ longitude: attr.longitude, latitude: attr.latitude })
                    let point = res[0]
                    // 添加圆形区域
                    var circle = new BMap.Circle(point, attr.radius, { fillColor: "#FF9800", strokeColor: 'orange', strokeWeight: 1, fillOpacity: 0.3, strokeOpacity: 0.5 });
                    map.addOverlay(circle);
                    // 添加图标
                    this.addIconMarker(point, attr.icon, key)
                }
            }
            // 加载完区域之后
            this.loadDevice()
        }, 1000)
    }

    /**************************** 加载设备 ********************************/

    // 添加设备标记
    addEntityMarker(point, { id, name, picture }) {
        let _this = this
        const map = this.map

        // 删除所有设备
        let allOverlay = map.getOverlays();
        if (allOverlay.length > 0) {
            let index = allOverlay.findIndex(ele => ele['id'] === id)
            if (index >= 0) {
                map.removeOverlay(allOverlay[index]);
            }
        }
        // console.log(allOverlay)
        setTimeout(() => {
            // 复杂的自定义覆盖物
            function ComplexCustomOverlay() { }

            ComplexCustomOverlay.prototype = new BMap.Overlay();
            ComplexCustomOverlay.prototype.initialize = function (map) {
                this._map = map;
                var div = this._div = document.createElement("div");
                div.className = "device-marker";
                div.style.zIndex = BMap.Overlay.getZIndex(point.lat);
                // console.log(id,name,picture)
                if (picture) {
                    div.style.backgroundImage = `url(${picture})`
                    div.style.backgroundSize = 'cover'
                } else {
                    div.textContent = name[0]
                }
                div.onclick = function () {
                    _this.fire('hass-more-info', { entityId: id })
                }
                map.getPanes().labelPane.appendChild(div);
                return div;
            }
            ComplexCustomOverlay.prototype.draw = function () {
                var pixel = map.pointToOverlayPixel(point);
                this._div.style.left = pixel.x - 28 + "px";
                this._div.style.top = pixel.y - 28 + "px";
            }
            var myCompOverlay = new ComplexCustomOverlay();
            myCompOverlay.id = id
            map.addOverlay(myCompOverlay);
        }, 0)
    }

    // 更新位置
    loadDevice() {
        this.debounce(async () => {
            // 这里添加设备
            let states = this.hass.states
            let keys = Object.keys(states).filter(ele => ele.indexOf('device_tracker') === 0 || ele.indexOf('person') === 0)
            for (let key of keys) {
                let stateObj = states[key]
                let attr = stateObj.attributes
                // 如果有经纬度，并且不在家，则标记
                if (!attr['hidden'] && 'longitude' in attr && 'latitude' in attr && stateObj.state != 'home') {
                    let res = await this.translate({ longitude: attr.longitude, latitude: attr.latitude })
                    let point = res[0]
                    this.addEntityMarker(point, {
                        id: key,
                        name: attr.friendly_name,
                        picture: attr['entity_picture']
                    })
                }
            }
        }, 1000)
    }

    // 坐标转换
    translate({ longitude, latitude }) {
        return new Promise((resolve, reject) => {
            var points = [new BMap.Point(longitude, latitude)]
            var convertor = new BMap.Convertor();
            convertor.translate(points, 1, 5, function (data) {
                if (data.status === 0) {
                    resolve(data.points)
                }
            })
        })
    }

    // 触发事件
    fire(type, data) {
        const event = new Event(type, {
            bubbles: true,
            cancelable: false,
            composed: true
        });
        event.detail = data;
        this.dispatchEvent(event);
    }

    // 操作面板
    actionPanel() {

        // 获取所有设备
        this.deviceList = []

        let states = this.hass.states
        let keys = Object.keys(states).filter(ele => ele.indexOf('device_tracker') === 0
            || ele.indexOf('zone') === 0
            || ele.indexOf('person') === 0)
        keys.forEach(key => {
            let stateObj = states[key]
            let attr = stateObj.attributes
            if ('longitude' in attr && 'latitude' in attr) {
                this.deviceList.push({
                    id: key,
                    name: attr.friendly_name,
                    longitude: attr.longitude,
                    latitude: attr.latitude
                })
            }
        })

        const map = this.map
        // 定义一个控件类,即function
        function ZoomControl() {
            // 默认停靠位置和偏移量
            this.defaultAnchor = BMAP_ANCHOR_TOP_LEFT;
            this.defaultOffset = new BMap.Size(10, 10);
        }

        // 通过JavaScript的prototype属性继承于BMap.Control
        ZoomControl.prototype = new BMap.Control();

        // 自定义控件必须实现自己的initialize方法,并且将控件的DOM元素返回
        // 在本方法中创建个div元素作为控件的容器,并将其添加到地图容器中
        ZoomControl.prototype.initialize = (map) => {
            // 创建一个DOM元素
            var div = document.createElement("div");
            div.className = 'right-action-panel'
            div.style.cssText = `background:white;font-size:12px;`
            let select = document.createElement('select')
            select.className = "select-device"

            // 设备
            let optgroup = document.createElement('optgroup')
            optgroup.label = "设备"
            this.deviceList.forEach(ele => {
                let option = document.createElement('option')
                option.value = ele.id
                option.text = ele.name
                optgroup.appendChild(option)
            })
            select.appendChild(optgroup)

            select.onchange = () => {
                // 这里重新定位
                if (select.selectedIndex < this.deviceList.length) {
                    let { longitude, latitude } = this.deviceList[select.selectedIndex]
                    this.translate({ longitude, latitude }).then(res => {
                        map.centerAndZoom(res[0], 18);
                    })
                }
            }

            // 添加文字说明
            div.appendChild(select);
            // 添加DOM元素到地图中
            map.getContainer().appendChild(div);
            // 将DOM元素返回
            return div;
        }
        // 创建控件
        var myZoomCtrl = new ZoomControl();
        // 添加到地图当中
        map.addControl(myZoomCtrl);

    }


    /**
    * 防抖
    * @param {Function} fn
    * @param {Number} wait
    */
    debounce(fn, wait) {
        let cache = this.cache || {}
        let fnKey = fn.toString()
        let timeout = cache[fnKey]
        if (timeout != null) clearTimeout(timeout)
        cache[fnKey] = setTimeout(() => {
            fn()
            // 清除内存占用
            if (Object.keys(cache).length === 0) {
                this.cache = null
            } else {
                delete this.cache[fnKey]
            }
        }, wait)
        this.cache = cache
    }


    loadScript(src) {
        return new Promise((resolve, reject) => {
            let id = btoa(src)
            let ele = document.getElementById(id)
            if (ele) {
                resolve()
                return
            }
            let script = document.createElement('script')
            script.id = id
            script.src = src
            script.onload = function () {
                resolve()
            }
            document.querySelector('head').appendChild(script)
        })
    }

    set narrow(value) {
        let menuButton = this.shadow.querySelector('ha-menu-button')
        if (menuButton) {
            menuButton.hass = this.hass
            menuButton.narrow = value
        }
    }

    get panel() {
        return this._panel
    }

    set panel(value) {
        this._panel = value
        let { ak, url_path } = value.config
        this.url_path = url_path
        if (ak) {
            const _this = this
            window.BMap_HaBaiduMap = {
                url: `https://api.map.baidu.com/getscript?v=3.0&ak=${ak}`,
                close() {
                    let { $ } = _this
                    $('#gps').classList.toggle('hide')
                }
            }
            this.loadScript(BMap_HaBaiduMap.url).then(res => {
                this.ready()
            })
        } else {
            alert('请配置百度AK')
        }
    }
}

// 百度地图使用HTTPS协议
window.BMAP_PROTOCOL = "https"
window.BMap_loadScriptTime = (new Date).getTime()

customElements.define('ha-panel-baidu-map', HaPanelBaiduMap);

/* ----------------------------- 卡版 ----------------------------------- */
class LovelaceBaiduMap extends HTMLElement {

    static getConfigElement() {
        return document.createElement("lovelace-baidu-map-editor");
    }

    // 自定义默认配置
    static getStubConfig() {
        return { entity: "zone.home" }
    }

    /*
     * 设置配置信息
     */
    setConfig(config) {
        if (!config.entity) {
            throw new Error('你需要定义一个实体');
        }
        this._config = config;
        // 更新
        this.updated()
    }

    // 卡片的高度(1 = 50px)
    getCardSize() {
        return 3;
    }

    /*
     * 触发事件
     * type: 事件名称
     * data: 事件参数
     */
    fire(type, data) {
        const event = new Event(type, {
            bubbles: true,
            cancelable: false,
            composed: true
        });
        event.detail = data;
        this.dispatchEvent(event);
    }

    /*
     * 调用服务
     * service: 服务名称(例：light.toggle)
     * service_data：服务数据(例：{ entity_id: "light.xiao_mi_deng_pao" } )
     */
    callService(service_name, service_data = {}) {
        let arr = service_name.split('.')
        let domain = arr[0]
        let service = arr[1]
        this._hass.callService(domain, service, service_data)
    }

    // 通知
    toast(message) {
        this.fire("hass-notification", { message })
    }

    // 显示实体更多信息
    showMoreInfo(entityId) {
        this.fire('hass-more-info', { entityId })
    }

    /*
     * 接收HA核心对象
     */
    set hass(hass) {
        this._hass = hass
        if (this.isCreated === true) {
            this.updated(hass)
        } else {
            this.created(hass)
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            let id = btoa(src)
            let ele = document.getElementById(id)
            if (ele) {
                resolve()
                return
            }
            let script = document.createElement('script')
            script.id = id
            script.src = src
            script.onload = function () {
                resolve()
            }
            document.querySelector('head').appendChild(script)
        })
    }

    // 创建界面
    created(hass) {

        /* ***************** 基础代码 ***************** */
        const shadow = this.attachShadow({ mode: 'open' });
        // 创建面板
        const ha_card = document.createElement('ha-card');
        ha_card.className = 'lovelace-baidu-map'
        ha_card.innerHTML = ``
        shadow.appendChild(ha_card)
        // 创建样式
        const style = document.createElement('style')
        style.textContent = `
            .lovelace-baidu-map{}
            .device-marker{
                position:absolute;
                vertical-align: top;
                display: block;
                margin: 0 auto;
                width: 2.5em;
                text-align: center;
                height: 2.5em;
                line-height: 2.5em;
                font-size: 1.5em;
                border-radius: 50%;
                border: 0.1em solid var(--primary-color);
                color: rgb(76, 76, 76);
                background-color: white;
              }
        `
        shadow.appendChild(style);
        // 保存核心DOM对象
        this.shadow = shadow
        this.$ = this.shadow.querySelector.bind(this.shadow)
        // 创建成功
        this.isCreated = true

        /* ***************** 附加代码 ***************** */
        let { _config, $ } = this
        // 获取百度API
        let baiduApi = hass.states['map.baidu'].attributes['api']
        this.loadScript(baiduApi).then(() => {
            setTimeout(() => {
                this.ready()
            }, 1000)
        })
    }

    // 更新界面数据
    updated(hass) {
        let { $, _config, update_map } = this
        if (update_map) update_map();
    }

    // 百度地图加载
    ready() {
        if (window.BMap) {
            // 生成一个对象
            let div = this.shadow.querySelector('.lovelace-baidu-map')
            div.style.height = div.offsetWidth + 'px'
            var map = new BMap.Map(div);
            this.map = map
            //添加地图类型控件
            map.addControl(new BMap.MapTypeControl({
                mapTypes: [
                    BMAP_NORMAL_MAP,
                    BMAP_HYBRID_MAP
                ]
            }))
            // 启用鼠标滚轮缩放
            map.enableScrollWheelZoom();
            //触摸事件(解决点击事件无效)--触摸开始，开启拖拽
            map.addEventListener('touchmove', function (e) {
                map.enableDragging();
            });
            //触摸结束始，禁止拖拽
            map.addEventListener("touchend", function (e) {
                map.disableDragging();
            });
            // 添加区域
            this.loadZone()

            // 更新地图
            this.update_map = () => {
                let entity_id = this._config['entity']
                let { longitude, latitude, friendly_name, entity_picture, icon, radius } = this._hass.states[entity_id]['attributes']
                this.translate({ longitude, latitude }).then(res => {
                    let mPoint = res[0]
                    // 中心点
                    map.centerAndZoom(mPoint, 18);
                    if (entity_id.includes('zone.')) return;
                    this.addEntityMarker(mPoint, {
                        id: entity_id,
                        name: friendly_name,
                        picture: entity_picture
                    })
                })
            }
            this.update_map()
        }
    }

    //加载区域
    loadZone() {
        let map = this.map
        this.debounce(async () => {
            // 这里添加设备
            let states = this._hass.states
            let keys = Object.keys(states).filter(ele => ele.indexOf('zone') === 0)
            for (let key of keys) {
                let stateObj = states[key]
                let attr = stateObj.attributes
                // 如果有经纬度，并且不在家，则标记
                if (!attr['passive'] && 'longitude' in attr && 'latitude' in attr) {
                    let res = await this.translate({ longitude: attr.longitude, latitude: attr.latitude })
                    let point = res[0]
                    // 添加圆形区域
                    var circle = new BMap.Circle(point, attr.radius, { fillColor: "#FF9800", strokeColor: 'orange', strokeWeight: 1, fillOpacity: 0.3, strokeOpacity: 0.5 });
                    map.addOverlay(circle);
                    // 添加图标
                    this.addIconMarker(point, attr.icon, key)
                }
            }
        }, 1000)
    }

    // 添加Icon标记
    addIconMarker(point, icon, key) {
        let _this = this
        const map = this.map
        // 复杂的自定义覆盖物
        function ComplexCustomOverlay() { }

        ComplexCustomOverlay.prototype = new BMap.Overlay();
        ComplexCustomOverlay.prototype.initialize = function (map) {
            this._map = map;
            var div = this._div = document.createElement("div");
            div.style.position = "absolute";
            div.style.zIndex = BMap.Overlay.getZIndex(point.lat);
            div.style.MozUserSelect = "none";
            div.innerHTML = `<ha-icon icon="${icon}"></ha-icon>`
            map.getPanes().labelPane.appendChild(div);
            div.onclick = function () {
                _this.fire('hass-more-info', { entityId: key })
            }
            return div;
        }
        ComplexCustomOverlay.prototype.draw = function () {
            var pixel = map.pointToOverlayPixel(point);
            this._div.style.left = pixel.x - 12 + "px";
            this._div.style.top = pixel.y - 12 + "px";
        }
        var myCompOverlay = new ComplexCustomOverlay();

        map.addOverlay(myCompOverlay);
    }

    // 添加设备标记
    addEntityMarker(point, { id, name, picture }) {
        let _this = this
        const map = this.map

        // 删除所有设备
        let allOverlay = map.getOverlays();
        if (allOverlay.length > 0) {
            let index = allOverlay.findIndex(ele => ele['id'] === id)
            if (index >= 0) {
                map.removeOverlay(allOverlay[index]);
            }
        }
        // console.log(allOverlay)
        setTimeout(() => {
            // 复杂的自定义覆盖物
            function ComplexCustomOverlay() { }

            ComplexCustomOverlay.prototype = new BMap.Overlay();
            ComplexCustomOverlay.prototype.initialize = function (map) {
                this._map = map;
                var div = this._div = document.createElement("div");
                div.className = "device-marker";
                div.style.zIndex = BMap.Overlay.getZIndex(point.lat);
                // console.log(id, name, picture)
                if (picture) {
                    div.style.backgroundImage = `url(${picture})`
                    div.style.backgroundSize = 'cover'
                } else {
                    div.textContent = name[0]
                }
                div.onclick = function () {
                    _this.fire('hass-more-info', { entityId: id })
                }
                map.getPanes().labelPane.appendChild(div);
                return div;
            }
            ComplexCustomOverlay.prototype.draw = function () {
                var pixel = map.pointToOverlayPixel(point);
                this._div.style.left = pixel.x - 28 + "px";
                this._div.style.top = pixel.y - 28 + "px";
            }
            var myCompOverlay = new ComplexCustomOverlay();
            myCompOverlay.id = id
            map.addOverlay(myCompOverlay);
        }, 0)
    }

    // 坐标转换
    translate({ longitude, latitude }) {
        return new Promise((resolve, reject) => {
            var points = [new BMap.Point(longitude, latitude)]
            var convertor = new BMap.Convertor();
            convertor.translate(points, 1, 5, function (data) {
                if (data.status === 0) {
                    resolve(data.points)
                }
            })
        })
    }


    /**
    * 防抖
    * @param {Function} fn
    * @param {Number} wait
    */
    debounce(fn, wait) {
        let cache = this.cache || {}
        let fnKey = fn.toString()
        let timeout = cache[fnKey]
        if (timeout != null) clearTimeout(timeout)
        cache[fnKey] = setTimeout(() => {
            fn()
            // 清除内存占用
            if (Object.keys(cache).length === 0) {
                this.cache = null
            } else {
                delete this.cache[fnKey]
            }
        }, wait)
        this.cache = cache
    }
}
// 定义DOM对象元素
customElements.define('lovelace-baidu-map', LovelaceBaiduMap);


/* ********************  编辑预览  *************************** */

// 编辑预览
class LovelaceBaiduMapEditor extends HTMLElement {

    setConfig(config) {
        // console.log('预览配置', config)
        this._config = config;
    }

    configChanged(newConfig) {
        const event = new Event("config-changed", {
            bubbles: true,
            composed: true
        });
        event.detail = { config: newConfig };
        // console.log('更新预览配置', newConfig)
        this.dispatchEvent(event);
    }

    /*
     * 接收HA核心对象
     */
    set hass(hass) {
        this._hass = hass
        if (this.isCreated === true) {
            this.updated(hass)
        } else {
            this.created(hass)
        }
    }

    // 创建界面
    created(hass) {
        /* ***************** 基础代码 ***************** */
        const shadow = this.attachShadow({ mode: 'open' });

        let arr = [], list = [], states = hass.states
        Object.keys(states).filter(k => {
            // return true
            // 过滤设备
            if (k.indexOf('person') === 0 || k.indexOf('device_tracker') === 0) {
                let attributes = states[k]['attributes']
                return Reflect.has(attributes, 'latitude') && Reflect.has(attributes, 'longitude')
            }
            return false
        }).forEach(k => {
            list.push(states[k])
            arr.push(`<paper-item-body two-line>
                 ${states[k]['attributes']['friendly_name'] || ''}
                <div secondary>${k}</div>
            </paper-item-body>`)
        })
        // 创建面板
        const ha_card = document.createElement('ha-card');
        ha_card.className = 'lovelace-baidu-map-editor'
        ha_card.innerHTML = `
        <ha-paper-dropdown-menu label="实体">
            <paper-listbox slot="dropdown-content">
                ${arr.join('')}
            </paper-listbox>
        </ha-paper-dropdown-menu>
        `
        shadow.appendChild(ha_card)
        // 创建样式
        const style = document.createElement('style')
        style.textContent = `
            .lovelace-baidu-map-editor{padding:20px;}
            .lovelace-baidu-map-editor paper-item-body{
                padding:5px 10px;
                display:block;
                border-bottom:1px solid white;
            }
        `
        shadow.appendChild(style);
        // 保存核心DOM对象
        this.shadow = shadow
        this.$ = this.shadow.querySelector.bind(this.shadow)
        // 创建成功
        this.isCreated = true

        /* ***************** 附加代码 ***************** */
        let { _config, $ } = this
        let _this = this
        // // 定义事件
        $('.lovelace-baidu-map-editor paper-listbox').addEventListener('selected-changed', function () {
            let obj = list[this.selected]
            _this.configChanged({
                type: 'custom:lovelace-baidu-map',
                entity: obj.entity_id
            })
        })
    }

    // 更新界面数据
    updated(hass) {
        let { $, _config } = this
        // $('p').textContent = `当前实体ID：${_config.entity}`
    }
}
customElements.define("lovelace-baidu-map-editor", LovelaceBaiduMapEditor);

// 添加预览
window.customCards = window.customCards || [];
window.customCards.push({
    type: "lovelace-baidu-map",
    name: "百度地图",
    preview: true,
    description: "百度地图卡片"
});