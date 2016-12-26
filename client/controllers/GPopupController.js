(function() {
    'use strict';

    angular
        .module('chartApp')
        .controller('GPopupController', GPopupController);

    GPopupController.$inject = ['$scope', '$http', '$timeout', 'socket', '$compile', 'appconfig'];

    function formatImageUrl(url) {
        var url_s = url.split(";");
        url_s = url_s.filter(function(d) {
            return (/\S/.test(d));
        });
        return url_s;
    }

    function GPopupController($scope, $http, $timeout, socket, $compile, appconfig) {
        // init
        $scope.inloading = false;
        $scope.target = {
            apps: appconfig.apps
        };
        $scope.target.selectedApp = $scope.target.apps[0];

        var $tbbanner = $('.tbbanner');

        $scope.inloading = false;
        $scope.result = {};
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

        var $command_ta = $('#command');
        autosize($command_ta);

        $scope.queryCommand = JSON.stringify({ app: $scope.target.selectedApp });
        $scope.querySelect = '-result';
        $scope.queryLimit = 10;

        $scope.setSelectedApp = function(app) {
            $scope.target.selectedApp = app;
            var command = $scope.queryCommand;
            try {
                var jsoncommand = JSON.parse(command);
                jsoncommand.app = app;
                $scope.queryCommand = JSON.stringify(jsoncommand);
            } catch (e) {
                if (!command || command.length < 3) {
                    $scope.queryCommand = JSON.stringify({ app: $scope.target.selectedApp });
                    $scope.querySelect = '-result';
                    $scope.limit = 10;
                }
                alert(e);
            }
        }

        $scope.query = function(command, select, limit) {
            try {
                $scope.getGP(JSON.parse(command), select, JSON.parse(limit));
            } catch (e) {
                if (!command || command.length < 3) {
                    $scope.queryCommand = JSON.stringify({ app: $scope.target.selectedApp });
                    $scope.querySelect = '-result';
                    $scope.limit = 10;
                }
                alert(e);
            }

        };

        $scope.addGP = function(index) {
            // $timeout(function() { // simulate getting template
            var template = `<tr class='row' ng-model='result[${index}]'>
                        {{out('OUT ************ ' + result[${index}]._id)}}
                        <td width='5'>{{${index+1}}}
                        </td>
                        <td width='490'>
                            <canvas id='canvas_{{result[${index}]._id}}' width='{{468+20}}' height='{{300+20}}' style='border:0px solid #d3d3d3;'>
                                Your browser does not support the HTML5 canvas tag.
                            </canvas>
                        </td>
                        <td>
                            <textarea id='ta_{{result[${index}]._id}}' rows='4' cols='50' height='100%' width='100%'>{{getjson(result[${index}])}}</textarea>
                            <div class='gbound'>
                                <div class='gbutton'>
                                    <button class='b1' ng-click='applyright(result[${index}])'>>>></button>
                                    <button class='b2' ng-click='applyleft(result[${index}])'><<<</button>
                                    <button ng-click='save_gp(result[${index}])'><i class="fa fa-floppy-o" aria-hidden="true"></i></button>
                                    <button ng-click='restore_gp(result[${index}])'><i class="fa fa-undo" aria-hidden="true"></i></i></button>
                                    <button ng-click='delete_gp(result[${index}], ${index})'><i class="fa fa-trash-o" aria-hidden="true"></i></button>
                                </div>
                                <div class='gbutton-c'>
                                    <button ng-click='expand_editbox(result[${index}])'><i class="fa fa-expand" aria-hidden="true"></i></i></button>
                                    <button ng-click='colapse_editbox(result[${index}])'><i class="fa fa-compress" aria-hidden="true"></i></button>
                                    <label> <b>{{result[${index}]._id}}</b></label>
                                    <a href="/getGP/{{result[${index}]._id}}"> detail</a>
                                </div>
                                <div class='gbutton-r'>
                                    <button ng-click='sendTestBanner(result[${index}])'>test</button>
                                </div>
                            </div>
                        </td>

                        
                    </tr>`;

            var compiledeHTML = $compile(template)($scope);
            $tbbanner.append(compiledeHTML);

            $timeout(function() {
                $scope.preview($scope.result[index]);
                $scope.initCodeMirror($scope.result[index]);
            });
        };

        $scope.getGP = function(query, select, limit) {
            if (!query) {
                query = { app: $scope.target.selectedApp };
            }

            // phải empty view trước, nếu ko thì model result sẽ cập nhật lại tbBanner gây lỗi.
            $tbbanner.empty();
            $scope.inloading = true;
            $scope.result = {};
            $scope.loadstatus = {};

            socket.getGP({ query: query, selectOption: select, limit: limit }, function onSuccess(data) {
                if (data.err) {
                    alert(JSON.stringify(data.err));
                    return;
                }

                console.log(data);
                $scope.result = data.data; //.slice(0, 10);

                _.forEach($scope.result, function(item, index) {
                    $scope.addGP(index);
                });
            });
        }

        $scope.restore_gp = function(item) {
            $scope.inloading = true;
            // delete $scope.loadstatus[item._id]; // mình ko xóa đi mà chỉ init lại content mà thôi

            socket.getGP({ query: { _id: item._id }, selectOption: '-result', limit: 1 }, function onSuccess(data) {
                if (data.err) {
                    alert(JSON.stringify(data.err));
                    return;
                }
                console.log(data);

                // update scope.result
                var item_update = data.data[0];
                $scope.loadstatus[item._id].editor.getDoc().setValue($scope.getjson(item_update));

                // bước update này cũng ko thật cần thiết.
                for (var i = $scope.result.length - 1; i >= 0; i--) {
                    if ($scope.result[i]._id == item_update._id) {
                        $scope.result[i] = item_update;
                        break;
                    }
                };
            });
        }

        $scope.save_gp = function(item) {
            var data = $scope.loadstatus[item._id].editor.getValue();
            $scope.inloading = true;

            try {
                data = JSON.parse(data);
            } catch (e) {
                alert(JSON.stringify(e));
                return;
            }

            socket.saveGP({ _id: item._id, data: data }, function onSuccess(data) {
                if (data.err) {
                    alert(JSON.stringify(data.err));
                    return;
                }
                // console.log(data);
                alert(JSON.stringify(data));

                $scope.restore_gp(item);
            });
        }

        $scope.delete_gp = function(item, index) {
            $scope.inloading = true;

            if (window.confirm("Do you really want to delete?")) {
                // window.open("exit.html", "Thanks for Visiting!");
                socket.deleteGP({ _id: item._id }, function onSuccess(data) {
                    if (data.err) {
                        alert(JSON.stringify(data.err));
                        return;
                    }
                    console.log(data);
                    // alert(JSON.stringify(data));
                    $scope.result.splice(index, 1);
                    $('#canvas_' + item._id).closest('.row').remove();
                });
            }
        }

        $scope.sendTestBanner = function(item) {
            var data = $scope.loadstatus[item._id].editor.getValue();
            $scope.inloading = true;

            try {
                data = JSON.parse(data);
                if (_.has(data, 'result'))
                    delete data.result;
                var urls = data.url.split(";");
                urls = urls.filter(function(d) {
                    return (/\S/.test(d));
                });
                data.url = urls[0];
            } catch (e) {
                alert(JSON.stringify(e));
                return;
            }

            socket.sendTestBanner({ event: "news", name: $scope.queryTestUser, data: [data] }, function onSuccess(data) {
                if (data.err) {
                    alert(JSON.stringify(data.err));
                    return;
                }
                // console.log(data);
                alert(JSON.stringify(data));
            });
        }

        $scope.createGP = function() {
            $scope.inloading = true;

            socket.createGP({ app: $scope.target.selectedApp }, function onSuccess(data) {
                if (data.err) {
                    alert(JSON.stringify(data.err));
                    return;
                }
                console.log(data);
                // alert(JSON.stringify(data));
                $scope.result.push(data.data); //.slice(0, 10);
                $scope.addGP($scope.result.length - 1);
            });
        }

        $scope.out = function(str) {
            console.log(str);
        }

        $scope.jsontostring = function(obj) {
            return JSON.stringify(obj, null, 3)
        }
        $scope.pretty = function(obj) {
            return angular.toJson(obj, true);
        }
        $scope.getjson = function(obj) {
            try {
                var json = _.cloneDeep(obj);
                delete json._id;
                delete json.result;
                // return obj;
                return angular.toJson(json, true);
            } catch (e) {
                return '';
            }
        }
        $scope.applyleft = function(item) {}
        $scope.applyright = function(item) {
            return;
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
                    lineNumbers: false,
                    mode: "javascript"
                });

                $scope.loadstatus[item._id].editor = editor;
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

                fabric.Image.fromURL(formatImageUrl(item.url)[0], function(oImg) {

                    oImg.selectable = false;
                    oImg.setHeight(300);
                    oImg.setWidth(468);
                    oImg.setLeft(10);
                    oImg.setTop(10);

                    canvas.add(oImg);

                    oImg.moveTo(0);
                });

                fabric.Image.fromURL("/assets/close.png", function(oImg) {
                    oImg.selectable = false;
                    oImg.setHeight(24);
                    oImg.setWidth(24);
                    oImg.setLeft(canvas.width - 24);
                    oImg.setTop(0);

                    canvas.add(oImg);
                    oImg.moveTo(1);
                });


                _.forEach(item.arrUrlBtn, function(btnItem, index) {
                    fabric.Image.fromURL(btnItem, function(oImg) {
                        // oImg.selectable = false;
                        var a = 40;
                        var _w = oImg.width * 300 / (570 + a), // 20 là gia vị thoi
                            _h = oImg.height * 300 / (570 + a), // 570 là kích thước thật của ảnh.
                            _x = item.arrPos[index].x,
                            _y = item.arrPos[index].y;

                        _x = (_x + 0.5) * canvas.width * 0.9 - _w / 2 + canvas.width * 0.05;
                        _y = (-_y + 0.5) * canvas.height * 0.9 - _h / 2;
                        oImg.setHeight(_h);
                        oImg.setWidth(_w);
                        oImg.setLeft(_x);
                        oImg.setTop(_y);

                        canvas.add(oImg);
                        oImg.moveTo(1 + index);

                        $scope.loadstatus[item._id].btn = oImg;

                    });
                });

                // fabric.Image.fromURL(item.url, function(oImg) {

                //     oImg.selectable = false;
                //     oImg.setHeight(300);
                //     oImg.setWidth(468);
                //     oImg.setLeft(10);
                //     oImg.setTop(10);

                //     canvas.add(oImg);

                //     oImg.moveTo(0);
                // });

                // fabric.Image.fromURL("/assets/close.png", function(oImg) {
                //     oImg.selectable = false;
                //     oImg.setHeight(24);
                //     oImg.setWidth(24);
                //     oImg.setLeft(canvas.width - 24);
                //     oImg.setTop(0);

                //     canvas.add(oImg);

                //     oImg.moveTo(1);
                // });

                // fabric.Image.fromURL(item.urlBtn, function(oImg) {
                //     // oImg.selectable = false;
                //     var _w = oImg.width * 300 / (570 + 20), // 20 là gia vị thoi
                //         _h = oImg.height * 300 / (570 + 20),
                //         _x = item.pos.x,
                //         _y = item.pos.y;

                //     _x = (_x + 0.5) * canvas.width - _w / 2;
                //     _y = (-_y + 0.5) * canvas.height - _h / 2;
                //     oImg.setHeight(_h);
                //     oImg.setWidth(_w);
                //     oImg.setLeft(_x);
                //     oImg.setTop(_y);

                //     canvas.add(oImg);
                //     oImg.moveTo(1 + index);

                //     $scope.loadstatus[item._id].btn = oImg;
                // });
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
