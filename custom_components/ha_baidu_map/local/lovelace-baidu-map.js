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
        `
        shadow.appendChild(style);
        // 保存核心DOM对象
        this.shadow = shadow
        this.$ = this.shadow.querySelector.bind(this.shadow)
        // 创建成功
        this.isCreated = true

        /* ***************** 附加代码 ***************** */
        let { _config, $ } = this
        this.loadScript(hass.states['ha_baidu_map.api'].state).then(() => {
            this.ready()
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
            // 更新地图
            this.update_map = () => {
                let entity_id = this._config['entity']
                let { longitude, latitude, friendly_name, entity_picture, icon, radius } = this._hass.states[entity_id]['attributes']
                this.translate({ longitude, latitude }).then(res => {
                    let mPoint = res[0]
                    // 中心点
                    map.centerAndZoom(mPoint, 18);
                    if (entity_picture) {
                        this.addEntityMarker(mPoint, {
                            id: entity_id,
                            name: friendly_name,
                            picture: entity_picture
                        })
                    } else {
                        // 添加圆形区域
                        var circle = new BMap.Circle(mPoint, radius, { fillColor: "#FF9800", strokeColor: 'orange', strokeWeight: 1, fillOpacity: 0.3, strokeOpacity: 0.5 });
                        map.addOverlay(circle);
                        this.addIconMarker(mPoint, icon, entity_id)
                    }
                })
            }
            this.update_map()
        }
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
}
// 定义DOM对象元素
customElements.define('lovelace-baidu-map', LovelaceBaiduMap);


/* ********************  编辑预览  *************************** */

// 编辑预览
class LovelaceBaiduMapEditor extends HTMLElement {

    setConfig(config) {
        console.log('预览配置', config)
        this._config = config;
    }

    configChanged(newConfig) {
        const event = new Event("config-changed", {
            bubbles: true,
            composed: true
        });
        event.detail = { config: newConfig };
        console.log('更新预览配置', newConfig)
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
        console.log(hass)
        /* ***************** 基础代码 ***************** */
        const shadow = this.attachShadow({ mode: 'open' });

        let arr = [], list = [], states = hass.states
        Object.keys(states).filter(k => {
            return true
            // 过滤设备
            if (k.indexOf('zone') === 0 || k.indexOf('person') === 0 || k.indexOf('device_tracker') === 0) {
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
        // // 定义事件
        $('.lovelace-baidu-map-editor paper-listbox').addEventListener('selected-changed', function () {
            console.log(list[this.selected])
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