var scene, camera, renderer, controls, container, gui = {}, raycaster, sceneVoxels, changes = 0, _plane, _selectedDevice;

var CubeColors = {
    Red: 0,
    Orange: 1,
    Yellow: 2,
    Green: 3,
    Blue: 4,
    Indigo: 5,
    Violet: 6,
    properties: {
        0: { name: "red", hex: "#FF0000", attn: [0, 0, 0, 0, 0] },
        1: { name: "orange", hex: "#FF7F00", attn: [0, 0, 0, 0, 0] },
        2: { name: "yellow", hex: "#FFFF00", attn: [0, 0, 0, 0, 0] },
        3: { name: "green", hex: "#00FF00", attn: [0, 0, 0, 0, 0] },
        4: { name: "blue", hex: "#00FFFF", attn: [0, 0, 0, 0, 0] },
        5: { name: "indigo", hex: "#0000FF", attn: [0, 0, 0, 0, 0] },
        6: { name: "violet", hex: "#8B00FF", attn: [0, 0, 0, 0, 0] }
    }
};
$(document).ready(function () {
    init();
    showSubtoolBar();
    setTooltip();
    setOffSetTooltip();
    bindListeners();
    addDevice();
    editDevice();
    var config = null;
    if (typeof localStorage !== "undefined")
        config = localStorage.getItem("config");
    if (config !== null) {
        loadConfig(new Blob([config], { type: "text/plain;charset=utf-8" }));
    }
    else {  // Load default floor image.
        loadDefaultFloor();
    }
    animate();
});

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(20, window.innerWidth/window.innerHeight, 0.1, 10000);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth-25, window.innerHeight-25);
    container = document.getElementById('ThreeJS');
    container.appendChild( renderer.domElement );



    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minPolarAngle = Math.PI * (4 / 8);
    controls.maxPolarAngle = Math.PI * (8 / 8);
    controls.minAzimuthAngle = Math.PI * (-1 / 8);
    controls.maxAzimuthAngle = Math.PI * (1 / 8);
    controls.enableRotate = false;

    var ambientLight = new THREE.AmbientLight(0xffffff);
    ambientLight.name = "ambientlight";
    scene.add(ambientLight);

    /*var controller = CARTOGRAPHER.Controller;
    container.addEventListener('mousemove', controller.onDocumentMouseMove, false);
    container.addEventListener('mousedown', controller.onDocumentMouseDown, false);
    container.addEventListener('mouseup', controller.onDocumentMouseUp, false);
    container.addEventListener('touchstart', controller.onDocumentTouchStart, false);
    window.addEventListener('resize', controller.onWindowResize, false);

    var floorPanel = new GUI.FloorPanel();
    floorPanel.domElement.style.position = 'absolute';
    floorPanel.domElement.style.bottom = '0px';
    floorPanel.domElement.style.left = '0px';
    container.appendChild(floorPanel.domElement);
    gui.FloorPanel = floorPanel;

    var deviceUI = new GUI.DeviceUI();
    GUI.IntervalRefresh(800);
    gui.DeviceUI = deviceUI;

    var deviceContextMenu = new GUI.DeviceContextMenu();
    gui.DeviceContextMenu = deviceContextMenu;

    var devicePanel = new GUI.DevicePanel();
    container.appendChild(devicePanel.domElement);
    gui.DevicePanel = devicePanel;
    gui.DevicePanelList = [];*/

    raycaster = new THREE.Raycaster();

    sceneVoxels = new THREE.Scene();
    var ambientLightVoxels = new THREE.AmbientLight(0xffffff);
    ambientLightVoxels.name = "ambientlightvoxels";
    sceneVoxels.add(ambientLightVoxels);
    renderer.autoClear = false;


    setTimeout(function(){
        createPlane();
        //initDrawLine();
        //createVoxelAt();
        //redrawLine();
    } , 1000);
}

var _allCubes=[],_tempCubes=[], _cubeSize=5;
function initDrawLine(){
    initCursorVoxel(_cubeSize);
    createPlane();
    container.addEventListener('mousedown', onDocumentMouseDownDraw, false);
    container.addEventListener('mousemove', onDocumentMouseMoveDraw, false);
}

var _cursorVoxel;
function initCursorVoxel(cursorSize){
    _cursorVoxel = new THREE.Mesh(new THREE.CubeGeometry(cursorSize, cursorSize, cursorSize), new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: .5,
        side: THREE.DoubleSide,
        color: "silver",
        depthWrite: true
    }));
    scene.add(_cursorVoxel);
}

var drawModeRun=false;
function onDocumentMouseDownDraw(event){
    event.preventDefault();
    
    if(_drawMode.mode != ControlModes.DrawPoly){
        return false;
    }
    
    //loadDefaultFloor();
    _drawMode.mouseX = ((event.clientX - container.offsetLeft) / renderer.domElement.clientWidth) * 2 - 1;
    _drawMode.mouseY = -((event.clientY - container.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(_drawMode.mouseX, _drawMode.mouseY), camera);

    var intersects = raycaster.intersectObjects(_allCubes.concat((_tempCubes.concat([plane]))), true);
    _drawMode.selectedObject =intersects[0];
    //debugger;

    var voxel = createVoxelAt(_drawMode.selectedObject.point);
    scene.add(voxel);
    _tempCubes.push(voxel)
    //console.log('voxel' , voxel);         
    

    if(drawModeRun   == true){
        drawModeRun=false;
        
        redrawLine();
        commitPoly();
        
        return false;
    }
    drawModeRun=true;
}

function onDocumentMouseMoveDraw(event){
    if(_drawMode.mode != ControlModes.DrawPoly){
        return false;
    }

    event.preventDefault();

    _cursorVoxel.visible = false;
        
    //loadDefaultFloor();
    _drawMode.mouseX = ((event.clientX - container.offsetLeft) / renderer.domElement.clientWidth) * 2 - 1;
    _drawMode.mouseY = -((event.clientY - container.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;
    

    raycaster.setFromCamera(new THREE.Vector2(_drawMode.mouseX, _drawMode.mouseY), camera);
    var intersects = raycaster.intersectObject(plane, true);
    if (intersects.length > 0) {
        var point = snapPoint(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, plane.position.z + _cubeSize / 2), _cubeSize);
        _cursorVoxel.position.x = point.x;
        _cursorVoxel.position.y = point.y;
        _cursorVoxel.position.z = point.z;
        _cursorVoxel.visible = true;

        _drawMode.selectedObject = intersects[0];
    }
    
    if(_tempCubes.length < 1)return false;
    redrawLine();
    //debugger;
}

function getTouchPoint(x , y){
    if( typeof plane == "undefined" ){
        createPlane();
    }

    _drawMode.mouseX = ((x - container.offsetLeft) / renderer.domElement.clientWidth) * 2 - 1;
    _drawMode.mouseY = -((y - container.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(_drawMode.mouseX, _drawMode.mouseY), camera);
    //debugger;
    var intersects = raycaster.intersectObject(plane, true);
    var point;
    if (intersects.length > 0) {
        point = snapPoint(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, plane.position.z + _cubeSize / 2), _cubeSize);
    }
    return  point;
}


var _tempLine ,ind=1;
function redrawLine() {
    if(_tempCubes.length < 1)return false;

    if (_tempLine !== undefined) {
        scene.remove(_tempLine);
    }

    var geometry = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial({color: "silver"});    // Default line color. Should be set to the poly's color or the color of the cubes.
    var z = _floors.floorData[_floors.selectedFloorIndex].altitude + (_cubeSize / 2);  //hack because cubes aren't lining up with the floor
    var endPoint;
    
    for (var i = 0; i < _tempCubes.length; i++) {
        endPoint = snapPoint(_tempCubes[i].position, _cubeSize);
        geometry.vertices.push(endPoint);
    }
    if (1){//_drawMode.mode === ControlModes.DrawPoly && typeof endPoint !== "undefined") {
        endPoint = snapXYZ(_drawMode.selectedObject.point.x, _drawMode.selectedObject.point.y, z, _cubeSize);
        geometry.vertices.push(endPoint);
    }
    // console.log(geometry.vertices.length);

    if (_tempCubes.length > 0)
        material.color = _tempCubes[0].material.color;

    // console.log(_tempLine);
    _tempLine = new THREE.Line(geometry, material);
    _tempLine.name = "tempLine";
    scene.add(_tempLine);   
}

function commitPoly(){
    // scene.add(_tempLine);
    var poly = {
        polyId: _tempCubes[0].id,
        cubes: _tempCubes,
        line: _tempLine,
        color: _tempCubes[0].pen
    };
    
    _floors.floorData[_floors.selectedFloorIndex].gridData.polys.push(poly);
    _tempCubes = [];
    _tempLine=undefined;
}


//initgrid function Cartographer
function createPlane(){
    var index = _floors.selectedFloorIndex||0;
    var selectedFloor = _floors.floorData[_floors.selectedFloorIndex];
    
    var width = selectedFloor.mesh.geometry.parameters.width;
    var height = selectedFloor.mesh.geometry.parameters.height;
    var geometry = new THREE.PlaneBufferGeometry(width, height);

    plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        visible: false,
        depthWrite: false
    }));
    
    plane.position.x = selectedFloor.mesh.position.x;
    plane.position.y = selectedFloor.mesh.position.y;
    plane.position.z = selectedFloor.mesh.position.z;
    plane.name = "plane";
    scene.add(plane);


    selectedFloor.gridData = {
        'polys':[],
        'plane':plane,
        'cubeSize':_cubeSize
    }
    
    // var poly = {
    //     polyId: _tempCubes[0].id,
    //     cubes: _tempCubes,
    //     line: _tempLine,
    //     color: _tempCubes[0].pen
    // };
    // selectedFloor.gridData.polys.push(poly);



}

var _currentPen  = 0, _isCubesVisible=true, polylength=0; //default color 
function createVoxelAt(point) {
    var material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        color: CubeColors.properties[_currentPen].hex,
        depthWrite: false,
        visible: _isCubesVisible
    });

    _cubeGeometry = new THREE.CubeGeometry(_cubeSize, _cubeSize, _cubeSize);

    var voxel = new THREE.Mesh(_cubeGeometry, material);
    voxel.position.copy(point);
    if (typeof _drawMode.selectedObject !== "undefined" && typeof _drawMode.selectedObject.face !== "undefined")
        voxel.position.add(_drawMode.selectedObject.face.normal);
    voxel.position.divideScalar(_cubeSize).floor().multiplyScalar(_cubeSize).addScalar(_cubeSize / 2);
    voxel.position.z = _floors.floorData[_floors.selectedFloorIndex].altitude + (_cubeSize / 2);  //hack because cubes aren't lining up with the floor
    voxel.name = "cube" + _currentPen + '_' + voxel.position.x + ',' + voxel.position.y;
    voxel.pen = _currentPen;
    voxel.polyIndex = polylength++;
    return voxel;
}

function selectRect(){
    var geometry = new THREE.PlaneGeometry(2, 1);
    var material = new THREE.MeshBasicMaterial({
        color: 0xDB1E1E,
        //wireframe: true
    });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
}

function snapXYZ(x, y, z, gridSize) {
    return new THREE.Vector3(x, y, z)
    .divideScalar(gridSize).floor().multiplyScalar(gridSize).addScalar(gridSize / 2);
}

function snapPoint(point, gridSize) {
    return new THREE.Vector3(point.x, point.y, point.z)
        .divideScalar(gridSize).floor().multiplyScalar(gridSize).addScalar(gridSize / 2);
}


function showSubtoolBar() {
$('a.myButton').click(function() {
    var classes = this.classList;
    $('div.subMenu').hide();
    for (var i = 0; i < classes.length; i++) {
        if ($('div').hasClass(classes[i])) {
            $('div.subMenu').hide();
            $('.' + classes[i]).show();
        }
    }
    $(this).siblings().removeClass('active');
    $(this).addClass('active');
});
}

function bindListeners () {
    $('a.subMenuButton').click(function() {
        container.style.cursor = "default";
        $(this).siblings().removeClass('active');
        $(this).addClass('active');
    });
    $('#importFile').click( function () {
        $('#loadConfig').trigger('click');
    });
    $('#exportFile').click( function () {
        saveConfig();
    });
    $('#captureFile').click( function () {
        captureImage();
    });
    $('#importFloorImage').click( function () {
        $('#loadFloorImage').trigger('click');
    });
    $('#originFloorImage').click( function () {
        $('.toolbox-tools, .thirdMenu').attr('hidden', true);
        $('.thirdMenu')[1].removeAttribute("style");
        $('.originSubMenu')[0].removeAttribute('hidden');
        $('.originSubMenu.thirdMenu').attr('style', 'display:inline');
        $('.originFloorImage-dialog')[0].removeAttribute('hidden');
    });
    $('#scaleFloorImage').click( function () {
        $('.toolbox-tools, .thirdMenu').attr('hidden', true);
        $('.thirdMenu')[0].removeAttribute("style");
        $('.scaleSubMenu')[0].removeAttribute('hidden');
        $('.scaleSubMenu.thirdMenu').attr('style', 'display:inline');
        $('.scaleFloorImage-dialog')[0].removeAttribute('hidden');
    });
    $('.close-toolbox-tools').click( function () {
        $('.toolbox-tools').attr('hidden', true);
    });
    $('.penWalls').click( function () {
        controls.mouseButtons.ORBIT = -1;
        _drawMode.mode = ControlModes.DrawPoly;

        initDrawLine();
    });
    $('#loadConfig').change( function () {
        var file = $('#loadConfig').get(0).files[0];
        if (file) {
            loadConfig(file);
            $('#loadConfig').val("");
            changes = 1;
        }
    });
    $('#deviceType').change( function () {
        setDropDown();
    });
    $('#loadFloorImage').change( function () {
        var file = $('#loadFloorImage').get(0).files[0];
        if (file) {
            loadImage(file);
            $('#loadFloorImage').val("");
            changes = 1;
        }
    });

    $('#newFile, #clearFloorImage').click(function () {
        if (changes === 0) {
            _floors.clear();
            loadDefaultFloor();
            loadConfig(null);
        } else {
            $('#confirmNew').dialog('open');
        }
    });

    $('.device').click(function () {
        $('#deviceMenu')[0].removeAttribute('hidden');
        refreshDevices(); //TODO: change this function to load the device list from config in local storage
    });
    $('#deleteDevice').click(function () {
        deleteDevice();
    });
    $('#selectDevice').click(function () {
        selectDevice();
    });
    $('#moveDevice').click(function () {
        container.style.cursor = "crosshair";
        _drawMode.mode = ControlModes.MoveDevice;
    });
    $('#deviceContainerClose').click(function () {
        $('.deviceMenu').attr('hidden', true);
    });
    $('.addDevice').click(function () {
        controls.mouseButtons.ORBIT = -1;
        container.style.cursor = "crosshair";
        _drawMode.mode = ControlModes.AddDevice;
    });
    $('.editDevice').click(function () {
        controls.mouseButtons.ORBIT = -1;
        _drawMode.mode = ControlModes.EditDevice;
    });
    container.addEventListener('mousedown', function () {
        onMouseDown(event);
    });
    container.addEventListener('mousemove', function () {
        showLocation();
    });

    if ($('#confirmNew').length) {
        $('#confirmNew').dialog({
            autoOpen: false,
            resizeable: false,
            height: 190,
            width: 450,
            modal: true,
            buttons: {
                Yes: function () {
                    $('#confirmNew').dialog("close");
                    _floors.clear();
                    $('.custom-dialog').attr('hidden', true);
                    loadDefaultFloor();
                    loadConfig(null);
                    saveConfig(true);
                    changes = 0;
                },
                No: function () {
                    $('#confirmNew').dialog("close");
                }
            }
        });
    }



}

function animate () {
    requestAnimationFrame(animate);
    render();
    update();
}

function render () {
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(sceneVoxels, camera);
}

function update() {
    controls.target.z = 0;  // Lock camera control target to this altitude (but still allow x/y pan).
}

function drawAxesHelper(length, altitude) {
    if (typeof scene.axes !== "undefined")
        scene.remove(scene.axes);

    altitude = altitude || 0;

    scene.axes = new THREE.AxisHelper(length);
    scene.axes.name = "axes_z" + altitude;
    scene.axes.position.z = altitude;
    scene.add(scene.axes);
}

function createElement (tag, id, name, type, css) {
        var element = document.createElement(tag);
        element.id = id;
        element.type = type;
        element.class = name;
        element.name = id;
        element.style.cssText = css;
        return element;
}
