var app = angular.module('chartApp', ['ngTouch', 'rgkevin.datetimeRangePicker', 'ui.bootstrap']);

app.controller('CMonController', ['$scope', '$timeout', '$interval', '$location', 'socket', 'd3s',
    function($scope, $timeout, $interval, $location, socket, d3s) {
        $scope.loaded = function() {
            // console.log("scope.loaded");
            $('#side-menu').metisMenu();
        }

        $scope.whenTimeChange = function(data) {
            console.log('whenTimeChange');
            // console.log('start', data.from.format("DD-MM-YYYY HH:mm"));
            $scope.viewangle.selectedViewTimeRange.start = data.from;
            $scope.viewangle.selectedViewTimeRange.end = data.to;

            if ($scope.timeRangePicker.onupdate)
                $scope.timeRangePicker.onupdate = false;
            else
                $scope.viewangle.updateGraph();

        };

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
            sceneList: {},
            serverList: {},
            selectedView: 'all', // key, check it first
            selectedViewTimeRange: { start: null, end: null },
            serverListUpdateSelection: function() {
                _.forOwn($scope.viewangle.serverList, function(val, key) {
                    if (val) {
                        $scope.viewangle.selectedView = $scope.viewangle.list.gameserver;
                        return false; //break;
                    }
                })
                $scope.viewangle.updateGraph();
            },
            sceneListUpdateSelection: function() {
                _.forOwn($scope.viewangle.sceneList, function(val, key) {
                    if (val) {
                        $scope.viewangle.selectedView = $scope.viewangle.list.gamescene;
                        return false; //break;
                    }
                })
                $scope.viewangle.updateGraph();
            },
            updateGraph: function() {
                // d3s.updateView([], _.cloneDeep($scope.viewangle), _.cloneDeep($scope.datasource));
                d3s.updateView($scope.viewangle, $scope.datasource);
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
        $scope.countSelectedGameServerSelection = function() {
            var count = 0;
            var selected = 0;
            _.forOwn($scope.viewangle.serverList, function(value, key) {
                if (value) selected++;
                count++;
            })
            return selected + '/' + count;
        }
        $scope.countSelectedSceneSelection = function() {
            var count = 0;
            var selected = 0;
            _.forOwn($scope.viewangle.sceneList, function(value, key) {
                if (value) selected++;
                count++;
            })
            return selected + '/' + count;
        }

        $scope.updateViewAngleOption = function() {
            $scope.viewangle.loading = true;

            if ($scope.datasource.selectedEarlyTime == 0) {
                socket.timelineData({ oncache: false, limit: 0, date: $scope.datasource.selectedDate });
            } else if ($scope.datasource.selectedEarlyTime == -1) { // range
                socket.timelineData({ oncache: false, limit: 0, date: null, datefrom: $scope.datasource.selectedDateFrom, dateto: $scope.datasource.selectedDateTo});
            } else {
                // đối với server thật, mình sẽ lấy ở cache do đc cập nhật liên tục.
                // nhưng đang dùng server test servermon.js, nên sẽ ko dùng cache mà query từ db
                var absUrl = $location.absUrl();
                if (_.includes(absUrl, '3000')) {
                    socket.timelineData({ oncache: true, limit: ($scope.datasource.selectedEarlyTime * 2880 / 24), date: null });
                } else {
                    socket.timelineData({ oncache: false, limit: ($scope.datasource.selectedEarlyTime * 2880 / 24), date: null });
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
        $scope.$on('d3s.viewangleUpdate', function(event, data) {
            console.log('d3s.viewangleUpdate');
            // $scope.$apply(function() {
            //     $scope.viewangle.sceneList = data.sceneList;
            //     $scope.viewangle.serverList = data.serverList;
            //     // $scope.viewangle.sceneList = _.cloneDeep(data.sceneList);
            //     // $scope.viewangle.serverList = _.cloneDeep(data.serverList);
            // });

            // qua test có thể thấy là ko cần dùng _.cloneDeep
            $timeout(function() {
                $scope.viewangle.sceneList = data.sceneList;
                $scope.viewangle.serverList = data.serverList;

                var duration = moment.duration(data.daterange.end.diff(data.daterange.start));
                var max = Math.floor(duration.asMinutes()) + 1;

                // trong trường hợp d3js nhận đc dữ liệu mới, sẽ sinh daterange mới
                // => 1. reset lại viewangle.selectedViewTimeRange.start/end về null để có thể render mà ko bị lọc
                // => 2. cập nhật lại thanh timeRangePicker
                // => 3. set onupdate = true trước khi thay đổi timeRangePicker để ko gọi onTimeChange của picker
                if (data.selectedViewTimeRange.start == null || data.selectedViewTimeRange.end == null) {
                    // để timePicker ko gọi d3.updateGraph khi mà timePicker thay đổi giá trị, và gọi hàm $scope.whenTimeChange
                    $scope.timeRangePicker.onupdate = true;

                    $scope.timeRangePicker.time.from = 0;
                    $scope.timeRangePicker.time.to = max;
                }

                $scope.timeRangePicker.time.startdatetime = data.daterange.start;
                $scope.timeRangePicker.time.dTo = max;
            }, 0);

        })

        // main init section
        // console.log('viewangle: ' + JSON.stringify($scope.viewangle));

        d3s.init($scope.viewangle, $scope.datasource);
        socket.reg();
    }
]);

app.controller('SalesController', ['$scope', '$interval', function($scope, $interval) {
    $scope.salesData = [{
        hour: 1,
        sales: 54
    }, {
        hour: 2,
        sales: 66
    }, {
        hour: 3,
        sales: 77
    }, {
        hour: 4,
        sales: 70
    }, {
        hour: 5,
        sales: 60
    }, {
        hour: 6,
        sales: 63
    }, {
        hour: 7,
        sales: 55
    }, {
        hour: 8,
        sales: 47
    }, {
        hour: 9,
        sales: 55
    }, {
        hour: 10,
        sales: 30
    }];
    $interval(function() {
        var hour = $scope.salesData.length + 1;
        var sales = Math.round(Math.random() * 100);
        $scope.salesData.push({
            hour: hour,
            sales: sales
        });
    }, 1000, 10);
}]);

app.directive('linearChart', function($parse, $window) {
    return {
        restrict: 'EA',
        template: "<svg width='850' height='200'></svg>",
        link: function(scope, elem, attrs) {
            var exp = $parse(attrs.chartData);
            console.log("exp: " + exp);
            var salesDataToPlot = exp(scope);
            var padding = 20;
            var pathClass = "path";
            var xScale, yScale, xAxisGen, yAxisGen, lineFun;
            var d3 = $window.d3;
            var rawSvg = elem.find('svg');
            var svg = d3.select(rawSvg[0]);
            scope.$watchCollection(exp, function(newVal, oldVal) {
                salesDataToPlot = newVal;
                redrawLineChart();
            });

            function setChartParameters() {
                xScale = d3.scale.linear()
                    .domain([salesDataToPlot[0].hour, salesDataToPlot[salesDataToPlot.length - 1].hour])
                    .range([padding + 5, rawSvg.attr("width") - padding]);
                yScale = d3.scale.linear()
                    .domain([0, d3.max(salesDataToPlot, function(d) {
                        return d.sales;
                    })])
                    .range([rawSvg.attr("height") - padding, 0]);
                xAxisGen = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom")
                    .ticks(salesDataToPlot.length - 1);
                yAxisGen = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .ticks(5);
                lineFun = d3.svg.line()
                    .x(function(d) {
                        return xScale(d.hour);
                    })
                    .y(function(d) {
                        return yScale(d.sales);
                    })
                    .interpolate("basis");
            }

            function drawLineChart() {
                setChartParameters();
                svg.append("svg:g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0,180)")
                    .call(xAxisGen);
                svg.append("svg:g")
                    .attr("class", "y axis")
                    .attr("transform", "translate(20,0)")
                    .call(yAxisGen);
                svg.append("svg:path")
                    .attr({
                        d: lineFun(salesDataToPlot),
                        "stroke": "blue",
                        "stroke-width": 2,
                        "fill": "none",
                        "class": pathClass
                    });
            }

            function redrawLineChart() {
                setChartParameters();
                svg.selectAll("g.y.axis").call(yAxisGen);
                svg.selectAll("g.x.axis").call(xAxisGen);
                svg.selectAll("." + pathClass)
                    .attr({
                        d: lineFun(salesDataToPlot)
                    });
            }
            drawLineChart();
        }
    };
});
