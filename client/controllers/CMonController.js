(function() {
    'use strict';

    angular
        .module('chartApp')
        .controller('CMonController', CMonController);

    CMonController.$inject = ['$scope', '$timeout', '$interval', '$location', 'socket', 'd3s'];

    function CMonController($scope, $timeout, $interval, $location, socket, d3s) {
        // Init metis menu
        // th1: nếu view đc ng-include thì phải sử dụng hàm loaded
        // $scope.loaded = function() {
        //     console.log("scope.loaded");
        //     $('#side-menu').metisMenu();
        // }
        // th2: nếu sử dụng ui-route, hoặc viết trực tiếp cùng với controller thì gọi luôn js fn
        $('#side-menu').metisMenu();

        // show only time slider
        $scope.timeRangePicker = {
            time: {
                startdatetime: moment(), //new Date(),
                from: 0, // default low value
                to: 1020, // default high value
                step: 1, // step width
                minRange: 15, // min range
                dFrom: 0, // lowest integer
                dTo: 1440, // highest integer
                hours24: false // true for 24hrs based time | false for PM and AM
            },
            hasDatePickers: false,
            hasTimeSliders: true,
            onupdate: false
        };

        //******************************************************

        $scope.datasource = {
            selectedOpe: { '5000': true, '500': false, '5200': false, '1000': false, '6000': false },
            selectedOs: { 'iOS': true, 'Android': true },
            selectedBundle: '',
            selectedDate: new Date(),
            selectedDateFrom: new Date(),
            selectedDateTo: new Date(),
            selectedEarlyTime: 1, //hours, if equals to 0 then use selectedDate
            loadtime: 0
        }
        $scope.viewangle = {
            list: { all: 'all', gameserver: 'gameserver', gamescene: 'gamescene' },
            // sceneList: {},
            // serverList: {},
            selectedView: 'all', // key, check it first
            selectedViewTimeRange: { start: null, end: null },
            // serverListUpdateSelection: function() {
                // _.forOwn($scope.viewangle.serverList, function(val, key) {
                //     if (val) {
                //         $scope.viewangle.selectedView = $scope.viewangle.list.gameserver;
                //         return false; //break;
                //     }
                // })
                // $scope.viewangle.updateGraph();
            // },
            // sceneListUpdateSelection: function() {
                // _.forOwn($scope.viewangle.sceneList, function(val, key) {
                //     if (val) {
                //         $scope.viewangle.selectedView = $scope.viewangle.list.gamescene;
                //         return false; //break;
                //     }
                // })
                // $scope.viewangle.updateGraph();
            // },
            updateGraph: function() {
                // d3s.updateView([], _.cloneDeep($scope.viewangle), _.cloneDeep($scope.datasource));
                d3s.updateView($scope.viewangle, $scope.datasource);
            },
            updateXScale: function(data) { // called from range-picker.js, reg-ed in home.tracker.html
                // console.log('whenTimeChange'); 
                $scope.viewangle.selectedViewTimeRange.start = data.from;
                $scope.viewangle.selectedViewTimeRange.end = data.to;

                if ($scope.timeRangePicker.onupdate) {
                    $scope.timeRangePicker.onupdate = false;
                    // console.log('case 1');
                } else {
                    d3s.updateXScale($scope.viewangle.selectedViewTimeRange);
                    // console.log('case 2');
                }
            },
            loading: false
        }
        $scope.countSelectedOpe = function() {
            var count = 0;
            var selected = 0;
            _.forOwn($scope.datasource.selectedOpe, function(value, key) {
                if (value) selected++;
                count++;
            })
            return selected + '/' + count;
        }
        $scope.countSelectedOs = function() {
            var count = 0;
            var selected = 0;
            _.forOwn($scope.datasource.selectedOs, function(value, key) {
                if (value) selected++;
                count++;
            })
            return selected + '/' + count;
        }

        $scope.updateViewAngleOption = function() {
            $scope.viewangle.loading = true;

            if ($scope.datasource.selectedEarlyTime == 0) {
                socket.timelineData({ oncache: false, limit: 0, date: $scope.datasource.selectedDate });
                // socket.loginData({ oncache: false, limit: 0, date: $scope.datasource.selectedDate });
            } else if ($scope.datasource.selectedEarlyTime == -1) { // range
                socket.timelineData({ oncache: false, limit: 0, date: null, datefrom: $scope.datasource.selectedDateFrom, dateto: $scope.datasource.selectedDateTo });
                // socket.loginData({ oncache: false, limit: 0, date: null, datefrom: $scope.datasource.selectedDateFrom, dateto: $scope.datasource.selectedDateTo });
            } else {
                // đối với server thật, mình sẽ lấy ở cache do đc cập nhật liên tục.
                // nhưng đang dùng server test servermon.js, nên sẽ ko dùng cache mà query từ db
                var absUrl = $location.absUrl();
                if (_.includes(absUrl, '3000')) {
                    socket.timelineData({ oncache: true, limit: ($scope.datasource.selectedEarlyTime * 2880 / 24), date: null });
                    // socket.loginData({ oncache: true, limit: ($scope.datasource.selectedEarlyTime * 2880 / 24), date: null });
                } else {
                    socket.timelineData({ oncache: false, limit: ($scope.datasource.selectedEarlyTime * 2880 / 24), date: null });
                    // socket.loginData({ oncache: false, limit: ($scope.datasource.selectedEarlyTime * 2880 / 24), date: null });
                }
            }
        }

        // event listening on all broadcasting services
        $scope.$on('tld.response', function(event, data) {
            // $scope.$apply(function() { $scope.viewangle.loading = false; });

            // --> Dùng timeout thay cho $scope.$apply hoặc $scope.safeApply khi dữ liệu trả về
            // trong trạng thái không rõ ràng, sycn hoặc asycn.
            $timeout(function() {
                $scope.viewangle.loading = false;
                $scope.datasource.loadtime = data.duration;
                if (data.error) {
                    alert(data.error);
                }
            }, 0);
        })

        // comment: i dont even need this, because all data have been link by reference to d3s service.
        $scope.$on('d3s.updateDateRangeViewAngle', function(event, daterange) {
            console.log('d3s.updateDateRangeViewAngle');
            // qua test có thể thấy là ko cần dùng _.cloneDeep
            $timeout(function() {
                // $scope.viewangle.sceneList = data.sceneList;
                // $scope.viewangle.serverList = data.serverList;

                var duration = moment.duration(daterange.end.diff(daterange.start));
                var max = Math.floor(duration.asMinutes()) + 1;

                // trong trường hợp d3js nhận đc dữ liệu mới, sẽ sinh daterange mới
                // => 1. reset lại viewangle.selectedViewTimeRange.start/end về null để có thể render mà ko bị lọc
                // => 2. cập nhật lại thanh timeRangePicker
                // => 3. set onupdate = true trước khi thay đổi timeRangePicker để ko gọi onTimeChange của picker
              
                // if (data.selectedViewTimeRange.start == null || data.selectedViewTimeRange.end == null) {
                //     // để timePicker ko gọi d3.updateGraph khi mà timePicker thay đổi giá trị, và gọi hàm $scope.whenTimeChange
                //     $scope.timeRangePicker.onupdate = true;

                //     $scope.timeRangePicker.time.from = 0;
                //     $scope.timeRangePicker.time.to = max;
                // }

                $scope.timeRangePicker.time.startdatetime = daterange.start;
                $scope.timeRangePicker.time.dTo = max;
            }, 0);

        })

        // main init section
        // console.log('viewangle: ' + JSON.stringify($scope.viewangle));

        d3s.init($scope.viewangle, $scope.datasource);
        socket.reg();
    }

})();
