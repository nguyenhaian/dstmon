(function() {
    'use strict';

    angular
        .module('chartApp')
        .controller('BannerController', BannerController);

    BannerController.$inject = ['$scope', '$http', '$timeout', 'socket', '$compile'];

    function formatImageUrl(url) {
        var url_s = url.split(";");
        url_s = url_s.filter(function(d) {
            return (/\S/.test(d));
        });
        return url_s;
    }

    function BannerController($scope, $http, $timeout, socket, $compile) {
        // init
        $scope.target = {
            apps: ["dautruong", "3c", "52"]
        };
        $scope.target.selectedApp = $scope.target.apps[0];

        var $tbbanner = $('.tbbanner');

        $scope.inloading = false;
        $scope.result = {};
        $scope.loadstatus = {};
        $scope.bannerVer = 0;

        $scope.notix = {
            "_id": "582eb298f89ae2aa08f50ad4",
            "app": "siam",
            "note": "showType: Number, // 0: login, 1: lúc hết tiền ==== showLimit: Number, // số lần hiển thị tối da trong 1 ngày với 1 user ==== requirePayment: Hiển thị banner khi: 0: chưa nạp tiền, 1: nạp tiền & ko quan tâm, 2:nạp tiền & hiển thị banner, 3: Không quan tâm ===== priority: random hiển thị khi cùng giá trị ưu tiên, LQ, AG, Vip",
            "type": 10,
            "showType": 0,
            "showLimit": 100,
            "requirePayment": 3,
            "priority": 29,
            "os": 0,
            "version": [
                4.09,
                6.09
            ],
            "title": "  LQ > 100, Vip 9 Gợi ý nạp SMS = 100baht; Card = 1000 baht; IAP = 99.99$",
            "LQ": [
                0,
                10000000
            ],
            "AG": [
                0,
                500000
            ],
            "Vip": [
                9,
                9
            ],
            "url": "http://siamplayth.com/mconfig/banner/hettien/vip8910/vip8_1.png;http://siamplayth.com/mconfig/banner/hettien/vip8910/vip8_2.png;http://siamplayth.com/mconfig/banner/hettien/vip8910/vip8_3.png",
            "urllink": "https://www.google.com.vn/",
            "date": "2016-11-11T17:00:00.000Z",
            "dexp": "2016-11-18T17:00:00.000Z",
            "countBtn": 3,
            "arrTypeBtn": [
                "sms",
                "iap",
                "card"
            ],
            "arrUrlBtn": [
                "http://siamplayth.com/mconfig/banner/button/btn_sms.png",
                "http://siamplayth.com/mconfig/banner/button/btn_iap.png",
                "http://siamplayth.com/mconfig/banner/button/btn_card.png"
            ],
            "arrBonus": [
                25,
                25,
                25
            ],
            "arrValue": [
                3,
                4,
                4
            ],
            "arrPos": [{
                "x": -0.3,
                "y": -0.35
            }, {
                "x": 0,
                "y": -0.35
            }, {
                "x": 0.3,
                "y": -0.35
            }]
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

                // TODO: Check hỏi xem nếu có thay đổi ở các document thì hỏi họ có muốn save ko.
                $scope.query($scope.queryCommand, $scope.querySelect, $scope.queryLimit);
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
                $scope.getBanner(JSON.parse(command), select, JSON.parse(limit));
            } catch (e) {
                if (!command || command.length < 3) {
                    $scope.queryCommand = JSON.stringify({ app: $scope.target.selectedApp });
                    $scope.querySelect = '-result';
                    $scope.limit = 10;
                }
                alert(e);
            }

        };

        $scope.addBanner = function(index) {
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
                                    <button ng-click='save_banner(result[${index}])'><i class="fa fa-floppy-o" aria-hidden="true"></i></button>
                                    <button ng-click='restore_banner(result[${index}])'><i class="fa fa-undo" aria-hidden="true"></i></i></button>
                                    <button ng-click='delete_banner(result[${index}], ${index})'><i class="fa fa-trash-o" aria-hidden="true"></i></button>
                                </div>
                                <div class='gbutton-c'>
                                    <button ng-click='expand_editbox(result[${index}])'><i class="fa fa-expand" aria-hidden="true"></i></i></button>
                                    <button ng-click='colapse_editbox(result[${index}])'><i class="fa fa-compress" aria-hidden="true"></i></button>
                                    <label> <b>{{result[${index}]._id}}</b></label>
                                    <a href="/getBanner/{{result[${index}]._id}}"> detail</a>
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

        $scope.getBanner = function(query, select, limit) {
            if (!query) {
                query = { app: $scope.target.selectedApp };
            }

            // phải empty view trước, nếu ko thì model result sẽ cập nhật lại tbBanner gây lỗi.
            $tbbanner.empty();
            $scope.inloading = true;
            $scope.result = {};
            $scope.loadstatus = {};

            socket.getBanner({ bannerVer: $scope.bannerVer, query: query, selectOption: select, limit: limit }, function onSuccess(data) {
                if (data.err) {
                    alert(JSON.stringify(data.err));
                    return;
                }

                console.log(data);
                $scope.result = data.data; //.slice(0, 10);

                _.forEach($scope.result, function(item, index) {
                    $scope.addBanner(index);
                });
            });
        }

        $scope.restore_banner = function(item) {
            $scope.inloading = true;
            // delete $scope.loadstatus[item._id]; // mình ko xóa đi mà chỉ init lại content mà thôi

            socket.getBanner({ bannerVer: $scope.bannerVer, query: { _id: item._id }, selectOption: '-result', limit: 1 }, function onSuccess(data) {
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

        $scope.save_banner = function(item) {
            var data = $scope.loadstatus[item._id].editor.getValue();
            $scope.inloading = true;

            try {
                data = JSON.parse(data);
            } catch (e) {
                alert(JSON.stringify(e));
                return;
            }

            socket.saveBanner({ bannerVer: $scope.bannerVer, _id: item._id, data: data }, function onSuccess(data) {
                if (data.err) {
                    alert(JSON.stringify(data.err));
                    return;
                }
                // console.log(data);
                alert(JSON.stringify(data));

                $scope.restore_banner(item);
            });
        }

        $scope.delete_banner = function(item, index) {
            $scope.inloading = true;

            if (window.confirm("Do you really want to delete?")) {
                socket.deleteBanner({ bannerVer: $scope.bannerVer, _id: item._id }, function onSuccess(data) {
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

        $scope.createBanner = function() {
            $scope.inloading = true;

            socket.createBanner({ bannerVer: $scope.bannerVer, app: $scope.target.selectedApp }, function onSuccess(data) {
                if (data.err) {
                    alert(JSON.stringify(data.err));
                    return;
                }
                console.log(data);
                // alert(JSON.stringify(data));
                $scope.result.push(data.data); //.slice(0, 10);
                $scope.addBanner($scope.result.length - 1);
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
        $scope.initCodeMirror = function(item) {
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
        $scope.preview = function(item) {
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
            }
        }

        $scope.$on('response', function(event, data) {
                // $scope.$apply(function() { $scope.viewangle.loading = false; });

                // --> Dùng timeout thay cho $scope.$apply hoặc $scope.safeApply khi dữ liệu trả về
                // trong trạng thái không rõ ràng, sycn hoặc asycn.
                $timeout(function() {
                    $scope.inloading = false;
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
        $scope.initBannerVer = function(ver){
            $scope.bannerVer = ver;
            $scope.getBanner($scope.queryCommand, $scope.querySelect, $scope.queryLimit);    
        }
        
    }

})();
