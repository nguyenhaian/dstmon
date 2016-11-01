(function() {
    'use strict';

    angular
        .module('chartApp')
        .controller('GPopupController', GPopupController);

    GPopupController.$inject = ['$scope', '$http', '$timeout', 'socket'];

    function GPopupController($scope, $http, $timeout, socket) {

        // init
        $scope.inloading = false;
        $scope.target = {
            apps: ["dautruong", "siam", "indo", "3c", "52"]
        };
        $scope.target.selectedApp = $scope.target.apps[0];

        $scope.data = {};
        $scope.loadstatus = {};

        $scope.noti = {
            "_id": "57ed487f6b9c20112ab13298",
            "date": ("2016-09-29T17:00:00.000Z"),
            "dexp": ("2016-09-30T17:00:00.000Z"),
            "type": 1,
            "app": "dautruong",
            "title": "nạp Gold",
            "url": "http://mobile.tracking.dautruong.info/img/banner/150.png",
            "urllink": "",
            "urlBtn": "http://mobile.tracking.dautruong.info/img/banner/banner_btn.png",
            "pos": {
                "x": 0,
                "y": -0.32
            }
        };

        $scope.getGP = function() {
            $scope.inloading = true;
            socket.getGrettingPopup({ app: $scope.target.selectedApp }, function onSuccess(data) {
                // console.log("socket.getGrettingPopup");
                console.log(data);
                $scope.data = data;
            });
        }
        $scope.jsontostring = function(obj) {
            return JSON.stringify(obj, null, 3)
        }
        $scope.pretty = function(obj) {
            return angular.toJson(obj, true);
        }
        $scope.getjson = function(obj) {
            var json = _.cloneDeep(obj);
            delete json._id;
            // return obj;
            return angular.toJson(json, true);
        }
        $scope.applyleft = function(item) {}
        $scope.applyright = function(item) {
            if ($scope.loadstatus[item._id].btn) {
                var btn = $scope.loadstatus[item._id].btn;
                var _w = btn.width * 300 / (570 + 20), // 20 là gia vị thoi
                    _h = btn.height * 300 / (570 + 20),
                    _x = btn.left,
                    _y = btn.top;
                var canvas = $scope.loadstatus[item._id].canvas;
                // _x = (_x + 0.5) * canvas.width - _w / 2;
                // =>
                _x = (_x + _w / 2) / canvas.width - 0.5;
                // _y = (-_y + 0.5) * canvas.height - _h / 2;
                // =>
                _y = -(_y + _h / 2) / canvas.height + 0.5;
                item.pos.x = _x;
                item.pos.y = _y;
                var myTextArea = document.querySelector("#ta_" + item._id);
                myTextArea.value = $scope.getjson(item);
            }

        }
        $scope.initCodeMirror = function(item, index) {
            if (!$scope.loadstatus[item._id]) $scope.loadstatus[item._id] = {};
            if (!$scope.loadstatus[item._id].hasloadcode) {
                $scope.loadstatus[item._id].hasloadcode = true;
                var myTextArea = document.querySelector("#ta_" + item._id);
                // console.log(myTextArea.value);
                var editor = CodeMirror.fromTextArea(myTextArea, {
                    lineNumbers: false
                });
            }
            var width = $('.panel-heading').width() - 30;
            $('.CodeMirror').width(width - 510);

        }
        $scope.preview = function(item, index) {
            if (!$scope.loadstatus[item._id]) $scope.loadstatus[item._id] = {};
            if (!$scope.loadstatus[item._id].hasload) { // to make sure this function call when we need it
                $scope.loadstatus[item._id].hasload = true;
                fabric.Object.prototype.transparentCorners = false;

                var canvas = this.__canvas = new fabric.Canvas("canvas_" + item._id, {
                    // var canvas = new fabric.Canvas("canvas_" + item._id, {
                    backgroundColor: '#333',
                    HOVER_CURSOR: 'pointer'
                });
                $scope.loadstatus[item._id].canvas = canvas;

                canvas.setHeight(300 + 20);
                canvas.setWidth(468 + 20);

                fabric.Image.fromURL(item.url, function(oImg) {

                    oImg.selectable = false;
                    oImg.setHeight(300);
                    oImg.setWidth(468);
                    oImg.setLeft(10);
                    oImg.setTop(10);

                    canvas.add(oImg);
                });

                fabric.Image.fromURL("/assets/close.png", function(oImg) {
                    oImg.selectable = false;
                    oImg.setHeight(24);
                    oImg.setWidth(24);
                    oImg.setLeft(canvas.width - 24);
                    oImg.setTop(0);

                    canvas.add(oImg);
                });

                fabric.Image.fromURL(item.urlBtn, function(oImg) {
                    // oImg.selectable = false;
                    var _w = oImg.width * 300 / (570 + 20), // 20 là gia vị thoi
                        _h = oImg.height * 300 / (570 + 20),
                        _x = item.pos.x,
                        _y = item.pos.y;

                    _x = (_x + 0.5) * canvas.width - _w / 2;
                    _y = (-_y + 0.5) * canvas.height - _h / 2;
                    oImg.setHeight(_h);
                    oImg.setWidth(_w);
                    oImg.setLeft(_x);
                    oImg.setTop(_y);

                    canvas.add(oImg);

                    $scope.loadstatus[item._id].btn = oImg;
                });

                return;
                var myCanvas = document.getElementById("canvas_" + item._id);
                var ctx = myCanvas.getContext("2d");

                // 890 x 570 -> 468 x 300
                var img = new Image();
                img.onload = function() {
                    ctx.drawImage(img, 10, 10, 468, 300); // Or at whatever offset you like
                };
                img.src = item.url;

                var imgclose = new Image();
                imgclose.onload = function() {
                    ctx.drawImage(imgclose, myCanvas.width - 24, 0, 24, 24); // Or at whatever offset you like
                };
                imgclose.src = "/assets/close.png";

                // 289 x 85 -> 152 x 45
                var imgOpt1 = new Image();
                imgOpt1.onload = function() {
                    var _w = 152,
                        _h = 45,
                        _x = item.pos.x,
                        _y = item.pos.y;

                    _x = (_x + 0.5) * myCanvas.width - _w / 2;
                    _y = (-_y + 0.5) * myCanvas.height - _h / 2;
                    // vì tọa độ ở đây bị ngược so với design, nên phải convert hơi cực xíu
                    // ko giống nhau giữa x và y
                    ctx.drawImage(imgOpt1, _x, _y, _w, _h); // Or at whatever offset you like
                };
                imgOpt1.src = item.urlBtn;

                // var imgOpt2 = new Image();
                // imgOpt2.onload = function() {
                //     ctx.drawImage(imgOpt2, myCanvas.width-24, 0, 24, 24); // Or at whatever offset you like
                // };
                // imgOpt2.src = "/assets/close.png";

                var canvasOffset = $("#canvas_" + item._id).offset();
                var offsetX = canvasOffset.left;
                var offsetY = canvasOffset.top;
                var canvasWidth = myCanvas.width;
                var canvasHeight = myCanvas.height;
                var isDragging = false;

                function handleMouseDown(e) {
                    var canMouseX = parseInt(e.clientX - offsetX);
                    var canMouseY = parseInt(e.clientY - offsetY);
                    // set the drag flag
                    isDragging = true;
                    console.log("isDragging = true;");
                }

                function handleMouseUp(e) {
                    var canMouseX = parseInt(e.clientX - offsetX);
                    var canMouseY = parseInt(e.clientY - offsetY);
                    // clear the drag flag
                    isDragging = false;
                    console.log("isDragging = false;");
                }

                function handleMouseOut(e) {
                    var canMouseX = parseInt(e.clientX - offsetX);
                    var canMouseY = parseInt(e.clientY - offsetY);
                    // user has left the canvas, so clear the drag flag
                    //isDragging=false;

                    console.log("handleMouseOut");
                }

                function handleMouseMove(e) {
                    var canMouseX = parseInt(e.clientX - offsetX);
                    var canMouseY = parseInt(e.clientY - offsetY);
                    // if the drag flag is set, clear the canvas and draw the image
                    if (isDragging) {
                        // ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                        // ctx.drawImage(img, canMouseX - 128 / 2, canMouseY - 120 / 2, 128, 120);

                    }
                    console.log("handleMouseOut " + isDragging);
                }

                $("#canvas_" + item._id).mousedown(function(e) { handleMouseDown(e); });
                $("#canvas_" + item._id).mousemove(function(e) { handleMouseMove(e); });
                $("#canvas_" + item._id).mouseup(function(e) { handleMouseUp(e); });
                $("#canvas_" + item._id).mouseout(function(e) { handleMouseOut(e); });
            }
        }

        $scope.$on('response', function(event, data) {
                // $scope.$apply(function() { $scope.viewangle.loading = false; });

                // --> Dùng timeout thay cho $scope.$apply hoặc $scope.safeApply khi dữ liệu trả về
                // trong trạng thái không rõ ràng, sycn hoặc asycn.
                $timeout(function() {
                    $scope.inloading = false;
                    // $scope.datasource.loadtime = data.duration;
                    if (data.error) {
                        alert(data.error);
                    }
                }, 0);
            })
            // onscreen resize
        $(window).resize(function() {
            // $('span').text(x += 1);
            // console.log("$(window).resize");
            var width = $('.panel-heading').width() - 30;
            $('.CodeMirror').width(width - 510);
        });
        // end init

        // default action
        $scope.getGP();
    }

})();
