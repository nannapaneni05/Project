(function(){
	var _raycaster,_sceneVoxels,ambientLight,_controls,_scene,_camera,_renderer,_container,_cubeSize = 5;; 
	function init(){
		_scene = new THREE.Scene();

		_camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 50000);

		_renderer = new THREE.WebGLRenderer({  antialias: true });   //great 3D, doesn't allow thick lines.
		_renderer.setSize(window.innerWidth - 24, window.innerHeight - 65); //scrollbars screw up mouse postioning really badly.
		_container = document.getElementById('ThreeJS');
		_container.appendChild(_renderer.domElement);

		_controls = new THREE.OrbitControls(_camera, _renderer.domElement);
		_controls.minPolarAngle = Math.PI * (4 / 8);
		_controls.maxPolarAngle = Math.PI * (8 / 8);
		_controls.minAzimuthAngle = Math.PI * (-1 / 8);
		_controls.maxAzimuthAngle = Math.PI * (1 / 8);
		_controls.enableRotate = false;
		var ambientLight = new THREE.AmbientLight(0xffffff);
		ambientLight.name = "ambientlight";
		_scene.add(ambientLight);

		var controller = CARTOGRAPHER.Controller;
		_container.addEventListener('mousemove', controller.onDocumentMouseMove, false);
		_container.addEventListener('mousedown', controller.onDocumentMouseDown, false);
		_container.addEventListener('mouseup', controller.onDocumentMouseUp, false);
		_container.addEventListener('touchstart', controller.onDocumentTouchStart, false);
		window.addEventListener('resize', controller.onWindowResize, false);
		_cubeSize=5;
		/*var floorPanel = new GUI.FloorPanel();
		floorPanel.domElement.style.position = 'absolute';
		floorPanel.domElement.style.bottom = '0px';
		floorPanel.domElement.style.left = '0px';
		_container.appendChild(floorPanel.domElement);
		_gui.FloorPanel = floorPanel;

		var deviceUI = new GUI.DeviceUI();
		//background refresh
		GUI.IntervalRefresh(800);
		_gui.DeviceUI = deviceUI;

		var deviceContextMenu = new GUI.DeviceContextMenu();
		_gui.DeviceContextMenu = deviceContextMenu;

		var devicePanel = new GUI.DevicePanel();
		_container.appendChild(devicePanel.domElement);
		_gui.DevicePanel = devicePanel;
		_gui.DevicePanelList = [];
		*/
		_raycaster = new THREE.Raycaster();

		_sceneVoxels = new THREE.Scene();
		var ambientLightVoxels = new THREE.AmbientLight(0xffffff);
		ambientLightVoxels.name = "ambientlightvoxels";
		_sceneVoxels.add(ambientLightVoxels);
		_renderer.autoClear = false;

	}

	function animate() {
		requestAnimationFrame(animate);
		render();
		update();
	}

	function render() {
		_renderer.clear();
		_renderer.render(_scene, _camera);
		_renderer.clearDepth();
		_renderer.render(_sceneVoxels, _camera);    // Renders voxels on top of the map.
	}


	function update(){
		_controls.target.z = _targetZ;
	}


	function onDocumentMouseDown(event) {
	var intersects = _raycaster.intersectObjects(_allCubes.concat((_tempCubes.concat([_plane]))), true);

	var point = snapPoint(
		new THREE.Vector3(
			intersects[0].point.x, 
			intersects[0].point.y, 
			_plane.position.z + _cubeSize / 2), 
		_cubeSize);
	_cursorVoxel.position.x = point.x;
	_cursorVoxel.position.y = point.y;
	_cursorVoxel.position.z = point.z;
	_cursorVoxel.visible = true;

	if (_tempCubes.length > 0) {
		redrawLine();
	}
}   

function onDocumentMouseMove(event) {

}

function onDocumentMouseUp(event) {

}     


function redrawLine() {
        if (_tempLine !== undefined) {
            _sceneVoxels.remove(_tempLine);
        }

        var geometry = new THREE.Geometry();
        var material = new THREE.LineBasicMaterial({color: "silver"});    // Default line color. Should be set to the poly's color or the color of the cubes.
        var z = _floors.floorData[_floors.selectedFloorIndex].altitude + (_cubeSize / 2);  //hack because cubes aren't lining up with the floor
        var endPoint;

        for (var i = 0; i < _tempCubes.length; i++) {
            endPoint = snapPoint(_tempCubes[i].position, _cubeSize);
            geometry.vertices.push(endPoint);
        }
        if (_drawMode.mode === ControlModes.DrawPoly && endPoint !== undefined) {
            endPoint = snapXYZ(_drawMode.selectedObject.point.x, _drawMode.selectedObject.point.y, z, _cubeSize);
            geometry.vertices.push(endPoint);
        }

        if (_tempCubes.length > 0)
            material.color = _tempCubes[0].material.color;

        _tempLine = new THREE.Line(geometry, material);
        _tempLine.name = "tempLine";
        _sceneVoxels.add(_tempLine);
    }

    function redrawPolys(polys) {
        var i;
        if (_allLines !== undefined) {
            for (i = 0; i < _allLines.length; i++) {
                _sceneVoxels.remove(_allLines[i]);
            }
        }
        if (_allCubes !== undefined) {
            for (i = 0; i < _allCubes.length; i++) {
                _sceneVoxels.remove(_allCubes[i]);
            }
        }
        _allLines = [];
        _allCubes = [_plane];

        var z = _floors.floorData[_floors.selectedFloorIndex].altitude + (_cubeSize / 2);  //hack because cubes aren't lining up with the floor

        if (polys !== undefined) {
            for (i = 0; i < polys.length; i++) {
                if (_selectedPoly == polys[i]) {
                    continue;
                }
                var cubes = polys[i].cubes;
                var darkColor = new THREE.Color(CubeColors.properties[cubes[0].pen].hex);
                darkColor.l = .3;
                for (var j = 0; j < cubes.length; j++) {
                    cubes[j] = resizeCube(cubes[j], z);
                    cubes[j].material.color = darkColor;
                    _sceneVoxels.add(cubes[j]);
                    _allCubes.push(cubes[j]);
                }
                _sceneVoxels.add(polys[i].line);
                _allLines.push(polys[i].line);
            }
        }
        return _allCubes;
    }

	init();
})();



