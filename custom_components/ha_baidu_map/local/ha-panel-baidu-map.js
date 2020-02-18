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
				  border: 0.1em solid var(--ha-marker-color, var(--default-primary-color));
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
                let menuButton = document.createElement('ha-menu-button')
                menuButton.hass = this.hass
                menuButton.narrow = true
                toolbar.appendChild(menuButton)

                let title = document.createElement('div')
                title.setAttribute('main-title', '')
                title.textContent = '百度地图'
                toolbar.appendChild(title)
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

                this.actionPanel()

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
				map.addEventListener('touchmove', function(e) {
					map.enableDragging();
				});
				//触摸结束始，禁止拖拽
				map.addEventListener("touchend", function(e) {
					map.disableDragging();
				});
            } else {
                this.loadDevice()
            }
        }
    }
    
    /**************************** 加载区域 ********************************/
    
    // 添加Icon标记
    addIconMarker(point, icon, key){
        let _this = this
        const map = this.map        
        // 复杂的自定义覆盖物
        function ComplexCustomOverlay(){}
        
        ComplexCustomOverlay.prototype = new BMap.Overlay();
        ComplexCustomOverlay.prototype.initialize = function(map){
          this._map = map;
          var div = this._div = document.createElement("div");
          div.style.position = "absolute";
          div.style.zIndex = BMap.Overlay.getZIndex(point.lat);
          div.style.MozUserSelect = "none";
          div.innerHTML = `<iron-icon icon="${icon}"></iron-icon>`
          map.getPanes().labelPane.appendChild(div);
          div.onclick = function(){
            _this.fire('hass-more-info', { entityId: key })
          }
          return div;
        }
        ComplexCustomOverlay.prototype.draw = function(){
          var pixel = map.pointToOverlayPixel(point);
          this._div.style.left = pixel.x - 12 + "px";
          this._div.style.top  = pixel.y - 12 + "px";
        }
        var myCompOverlay = new ComplexCustomOverlay();
        
        map.addOverlay(myCompOverlay);
    }
    
    //加载区域
    loadZone(){
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
    addEntityMarker(point, { id, name, picture}){
        let _this = this
        const map = this.map 
        
        // 删除所有设备
        let allOverlay = map.getOverlays();
        if (allOverlay.length > 0) {
            let index = allOverlay.findIndex(ele=>ele['id']===id)
            if(index >= 0){
                map.removeOverlay(allOverlay[index]);
            }
        }
        // console.log(allOverlay)
        setTimeout(()=>{
            // 复杂的自定义覆盖物
            function ComplexCustomOverlay(){}
            
            ComplexCustomOverlay.prototype = new BMap.Overlay();
            ComplexCustomOverlay.prototype.initialize = function(map){
              this._map = map;
              var div = this._div = document.createElement("div");
              div.className = "device-marker";
              div.style.zIndex = BMap.Overlay.getZIndex(point.lat);
              // console.log(id,name,picture)
              if(picture){
                div.style.backgroundImage = `url(${picture})`
                div.style.backgroundSize = 'cover'
              }else{
                div.textContent = name[0]
              }
              div.onclick = function(){
                _this.fire('hass-more-info', { entityId: id })
              }
              map.getPanes().labelPane.appendChild(div);
              return div;
            }
            ComplexCustomOverlay.prototype.draw = function(){
              var pixel = map.pointToOverlayPixel(point);
              this._div.style.left = pixel.x - 28 + "px";
              this._div.style.top  = pixel.y - 28 + "px";
            }
            var myCompOverlay = new ComplexCustomOverlay();
            myCompOverlay.id = id
            map.addOverlay(myCompOverlay);
        },0)
    }
    
    // 更新位置
    loadDevice() {
        let map = this.map        
        this.debounce(async () => {
            // 这里添加设备
            let states = this.hass.states
            let keys = Object.keys(states).filter(ele => ele.indexOf('device_tracker') === 0)
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
        let keys = Object.keys(states).filter(ele => ele.indexOf('device_tracker') === 0 || ele.indexOf('zone') === 0)
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
			// 功能
			let optgroupAction = document.createElement('optgroup')
			optgroupAction.label = "功能"
            let actionArr = [{id:'a1',name:'GPS运动轨迹' }]
			actionArr.forEach(ele => {
                let option = document.createElement('option')
                option.value = ele.id
                option.text = ele.name
                optgroupAction.appendChild(option)
            })
			select.appendChild(optgroupAction)
			
            select.onchange = () => {
                // 这里重新定位
				if(select.selectedIndex < this.deviceList.length){
					let { longitude, latitude } = this.deviceList[select.selectedIndex]
					this.translate({ longitude, latitude }).then(res => {
						map.centerAndZoom(res[0], 18);
					})	
				}else{
					if(select.value === 'a1'){
						let gg = this.$('#gps')
						gg.src = `${this.url_path}/travel.html?r=${Date.now()}`
						gg.classList.toggle('hide')
					}
					// console.log(select.value)
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
		if(menuButton){
			menuButton.hass = this.hass
			menuButton.narrow = value
		}
    }
	
    get panel() {
        return this._panel
    }

    set panel(value) {
        this._panel = value
		let {ak, url_path} = value.config
		this.url_path = url_path
        if (ak) {
            if (ak === 'ha_cloud_music') { ak = 'hNT4WeW0AGvh2GuzuO92OfM6hCW25HhX' }
            window.BMAP_PROTOCOL = "https"
            window.BMap_loadScriptTime = (new Date).getTime()
			const _this = this
			window.BMap_HaBaiduMap = {
				url: `https://api.map.baidu.com/getscript?v=3.0&ak=${ak}`,
				close(){
					let {$} = _this
					$('.select-device').selectedIndex = 0
					
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

customElements.define('ha-panel-baidu-map', HaPanelBaiduMap);