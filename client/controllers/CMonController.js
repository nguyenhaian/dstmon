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

        console.log('CMonController init')

        //******************************************************
        $scope.sd3Charts = [];
        $scope.datasource = {
            selectedOpe: { '5000': true, '500': true, '5200': true, '1000': true, '6000': false },
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
            updateGraph: function() {
                $scope.sd3Charts.forEach(function(chart, index, array) {
                    chart.updateView();
                });
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
            var option = {};
            if ($scope.datasource.selectedEarlyTime == 0) {
                option = { oncache: false, limit: 0, date: $scope.datasource.selectedDate };
            } else if ($scope.datasource.selectedEarlyTime == -1) { // range
                option = { oncache: false, limit: 0, date: null, datefrom: $scope.datasource.selectedDateFrom, dateto: $scope.datasource.selectedDateTo };
            } else {
                // đối với server thật, mình sẽ lấy ở cache do đc cập nhật liên tục.
                // nhưng đang dùng server test servermon.js, nên sẽ ko dùng cache mà query từ db
                var absUrl = $location.absUrl();
                if (_.includes(absUrl, '3000')) {
                    option = { oncache: true, limit: ($scope.datasource.selectedEarlyTime * 2880 / 24), date: null };
                } else {
                    option = { oncache: false, limit: ($scope.datasource.selectedEarlyTime * 2880 / 24), date: null };
                }
            }

            $scope.sd3Charts.forEach(function(chart, index, array) {
                chart.requestdata(option);
            });
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

        $scope.regsd3chart = function(item) {
            console.log('CMonController regsd3chart')
            $scope.sd3Charts.push(item);
        }

        // main init section

        // console.log('datasource: ' + JSON.stringify($scope.datasource));
        socket.reg(function onSuccess(distData) {
            $scope.sd3Charts.forEach(function(chart, index, array) {
                chart.init(distData);
            });
        });
    }

})();
