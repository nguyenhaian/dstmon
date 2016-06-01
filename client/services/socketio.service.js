(function() {
    'use strict';

    angular
        .module('chartApp')
        .factory('socket', ['d3s', '$rootScope', '$location', '$http', function(d3s, $rootScope, $location, $http) {
            var absUrl = $location.absUrl();
            var startLoadingTime = null;
            // var url = 'http://203.162.121.174:3003/tracker';
            var url = absUrl + 'tracker';
            console.log('absUrl: ' + absUrl)
            var socket = io(url, { transports: ['websocket'] });

            var getTimeStamp = function() {
                return moment().format("DD-MM-YYYY HH:mm:ss.SSS");
            }

            function timelineData(option) { // {oncache:false, limit, from, to}
                console.log(getTimeStamp() + " ----> request timeline data: " + JSON.stringify(option));
                // socket.emit("tk.timelineData", option); // tk: tracker
                $http.post('/timelineData', option, {}).then(function successCallBack(response) {
                    if (response.data.error != null) {
                        alert(response.data.error)
                    }
                    var samplestep = 30 * 1;
                    if (response.data.samplestep) {
                        samplestep = response.data.samplestep;
                    }

                    var jsondata = response.data.timelineData;
                    console.log(getTimeStamp() + " <---- response timeline data: " + jsondata.length);
                    var duration = moment.duration(moment().diff(startLoadingTime)).asSeconds();
                    $rootScope.$broadcast('tld.response', {
                        status: 'done',
                        duration: duration
                    });
                    d3s.fillData(jsondata, samplestep);
                }, function errorCallback(error) {
                    console.log(getTimeStamp() + " <---- response timeline error: " + error);
                    $rootScope.$broadcast('tld.response', {
                        status: 'error',
                        error: error,
                        duration: duration
                    });
                });
                startLoadingTime = moment();
            }

            socket.on("mobile_reginfo", function(data) {
                console.log("<---- mobile_reginfo ");
            });

            socket.on("mobile_changeScene", function(data) {
                console.log("<---- mobile_changeScene");
            });

            socket.on("mobile_disconnect", function(data) {
                console.log("<---- mobile_disconnect");
                // $scope.signals.push(JSON.stringify(data));

                // console.log("<---- signals " + $scope.signals.length);
                // $rootScope.$apply(function () {
                //  // callback.apply(socket, args);
                // });
            });

            socket.on('tld.response', function(jsondata) {
                console.log(getTimeStamp() + " <---- response timeline data: " + jsondata.length);
                var duration = moment.duration(moment().diff(startLoadingTime)).asSeconds();
                $rootScope.$broadcast('tld.response', {
                    status: 'done',
                    duration: duration
                });
                d3s.fillData(jsondata);
            });

            socket.on('tld.response.error', function(error) {
                console.log(getTimeStamp() + " <---- response timeline error: " + error);
                $rootScope.$broadcast('tld.response', {
                    status: 'error',
                    error: error,
                    duration: duration
                });
            });

            socket.on('dist.response', function(jsondata) {
                console.log(getTimeStamp() + " <---- response dist data: " + _.size(jsondata.data));
                if (!jsondata.status) {
                    console.log('dist.response false');
                    return;
                }

                d3s.setDist(jsondata.data);
                timelineData({ oncache: true, limit: 100 });
            });

            return {
                reg: function() {
                    console.log(getTimeStamp() + " ----> reg");
                    socket.emit("tk.on", { realtime: false });
                },
                getDist: function() { // TODO: chua truyen vao alreadyHaveList
                    console.log(getTimeStamp() + " ----> getDist");
                    // socket.emit("tk.getdist");
                    $http.post('/dist', [], {}).then(function successCallBack(response) {
                        var jsondata = response.data.data;
                        console.log(getTimeStamp() + " <---- response dist data: " + _.size(jsondata.data));
                        if (!jsondata.status) {
                            console.log('dist.response false');
                            return;
                        }

                        d3s.setDist(jsondata.data);
                    }, function errorCallback(error) {
                        console.log(error);
                    });
                },
                timelineData: timelineData
            };
        }]);
})();
