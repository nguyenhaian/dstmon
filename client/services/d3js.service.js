(function() {
    'use strict';

    angular
        .module('chartApp')
        .factory('d3s', ['$rootScope', function($rootScope) {
            // rawdata and viewoptions variables
            var jsondata = [];
            var samplestep = 30 * 1;
            var viewangle = {};
            var datasource = {};
            var distsInfo = {};

            // svg variables
            var margin, width, height, x, y, color, xAxis, yAxis, line, svg;

            var parseDate = d3.time.format("%d-%m-%Y %H:%M:%S").parse; //"09-05-2016 11:56:10"

            // prepareData: format data từ jsondata, do dó phải set jsondata trước
            var prepareData = function() {
                var data = [],
                    listSceneName = [],
                    listIPAddress = [],
                    daterange = {};
                // format data
                // {
                //     time:"9/5/2016 10:26:36",
                //     gameview8006: 12,
                //     loginview:1
                // }
                var renderPoints = jsondata.length; // tính theo % số điểm đc render trên tổng bộ dữ liệu totalPoints
                if (viewangle.selectedViewTimeRange.start != null && viewangle.selectedViewTimeRange.end != null && samplestep != 0) {
                    console.log('use date slicing');
                    var duration = moment.duration(viewangle.selectedViewTimeRange.end.diff(viewangle.selectedViewTimeRange.start));
                    renderPoints = Math.round(duration.asMinutes() / (samplestep / 60)); // samplestep (s) take an sample
                }
                console.log('renderPoints: ' + renderPoints);
                console.log('render step min: ' + samplestep + '(s)');
                var maxRenderPoint = width / 1; // 1 pixel một mẫu
                // ->
                var renderstep = Math.floor(renderPoints / maxRenderPoint) + 1;

                console.log('render step: ' + renderstep + '|' + (renderstep * samplestep) + '(s)');
                // console.log('jsondata[jsondata.length - 1].time:' + jsondata[jsondata.length - 1].time);

                daterange.start = moment(jsondata[jsondata.length - 1].time, "DD-MM-YYYY HH:mm:ss");
                daterange.end = moment(jsondata[0].time, "DD-MM-YYYY HH:mm:ss");

                for (var i = jsondata.length - 1; i >= 0; i -= renderstep) {
                    var _item = jsondata[i];

                    // 0. Lọc theo viewangle.selectedViewTimeRange
                    if (viewangle.selectedViewTimeRange.start != null && viewangle.selectedViewTimeRange.end != null) {
                        if (moment(_item.time, "DD-MM-YYYY HH:mm:ss").isBefore(viewangle.selectedViewTimeRange.start))
                            continue;
                        if (moment(_item.time, "DD-MM-YYYY HH:mm:ss").isAfter(viewangle.selectedViewTimeRange.end))
                            continue;
                    }

                    var item = { date: parseDate(_item.time) };

                    _.forOwn(_item.formattedData, function(_dist, _distid) { //(value, key)
                        if (_distid == 0) {
                            return;
                        }

                        if (!_.has(distsInfo, _distid)) {
                            // TODO: sẽ phải cạp nhật distInfo
                            console.log("distsInfo need update " + _distid);
                            return true; // continue
                        }

                        // 1. check datasource.selectedOpe
                        var op = distsInfo[_distid].op;
                        if (datasource.selectedOpe[op] == false) {
                            return true; // continue
                        }
                        // 2. check datasource.selectedOs
                        var os = distsInfo[_distid].os;
                        if (datasource.selectedOs[os] == false) {
                            return true; // continue
                        }
                        // 3. check datasource.selectedBundle
                        var bundle = distsInfo[_distid].bundle;
                        if (!_.isEmpty(datasource.selectedBundle) && datasource.selectedBundle !== bundle) {
                            return true; // continue
                        }

                        produceDataItem(_dist, item, listSceneName, listIPAddress);
                    });

                    // console.log(JSON.stringify(item))
                    data.push(item);
                };

                // console.log('listIPAddress: ' + JSON.stringify(listIPAddress))

                viewangle = updateViewAngle(viewangle, listSceneName, listIPAddress, daterange);

                // fill data to rows 1
                if (viewangle.selectedView == viewangle.list.all) {
                    // do nothing
                } else if (viewangle.selectedView == viewangle.list.gamescene) {
                    _.forEach(listSceneName, function(value) {
                        if (!_.has(data[0], value)) {
                            // loc theo viewangle
                            // console.log("********** check " + value)
                            if (!_.isEmpty(viewangle.sceneList) && !viewangle.sceneList[value]) {
                                // console.log("********** exclude " + value)
                                return true; // continue
                            }
                            data[0][value] = 0;
                        }
                    })
                } else { // gameserver
                    _.forEach(listIPAddress, function(value) {
                        if (!_.has(data[0], value)) {
                            // loc theo viewangle
                            // lưu ý, có trường hợp ko bị exclude, do data có thể xuất hiện ở các index > 0
                            // console.log("********** check " + value)
                            if (!_.isEmpty(viewangle.serverList) && !viewangle.serverList[value]) {
                                // console.log("********** exclude " + value)
                                return true; // continue
                            }
                            data[0][value] = 0;
                        }
                    })
                }

                // console.log(viewangle.sceneList);
                console.log('data[0]:' + JSON.stringify(data[0]));

                return data;
            }

            var updateViewAngle = function(viewangle, listSceneName, listIPAddress, daterange) {
                // update viewangle khi có sự thay đổi về datasource selection, hoặc có data mới từ network
                // if (!_.isEmpty(_datasource) || Array.isArray(_jsondata) && _jsondata.length > 0) {
                // 1. loại các view thừa do thay đổi datasource
                _.forEach(viewangle.sceneList, function(value, key) {
                    // console.log('check viewangle.sceneList[' + key + ']')
                    if (!_.includes(listSceneName, key)) {
                        // console.log('delete viewangle.sceneList[' + key + ']')
                        delete viewangle.sceneList[key]
                    }
                })
                _.forEach(viewangle.serverList, function(value, key) {
                    // console.log('check viewangle.serverList[' + key + ']')
                    if (!_.includes(listIPAddress, key)) {
                        // console.log('delete viewangle.serverList[' + key + ']')
                        delete viewangle.serverList[key]
                    }
                })

                // 2. thêm view và giá trị mặc định của view nếu chưa khai báo
                _.forEach(listSceneName, function(value) {
                    if (!_.has(viewangle.sceneList, value)) {
                        viewangle.sceneList[value] = (value.includes('GAME_VIEW') || value.includes('LOGIN_VIEW'));
                    }
                })
                _.forEach(listIPAddress, function(value) {
                    // console.log('check listIPAddress[' + value + ']')
                    if (!_.has(viewangle.serverList, value)) {
                        // console.log('add listIPAddress[' + value + ']')
                        viewangle.serverList[value] = true;
                    }
                })

                // 3. tính selectedViewTimeRange
                viewangle.daterange = daterange;

                // 4. update viewangle về cho view controller
                $rootScope.$broadcast('d3s.viewangleUpdate', viewangle);

                return viewangle;
                // }
            }

            var produceDataItem = function(_dist, item, listSceneName, listIPAddress) {
                _.forOwn(_dist.data, function(_gamedata, _ipadd) {
                    if (!_.includes(listIPAddress, _ipadd)) {
                        listIPAddress.push(_ipadd);
                        // console.log("+ _ipadd " + _ipadd + " _dist: " + JSON.stringify(_dist))
                    }

                    // _gamedata = {"8004":{GAME_VIEW:1}};
                    _.forOwn(_gamedata, function(_scenedata, _gameid) {
                        // _scenedata = {GAME_VIEW:1,LOGIN_VIEW:1};
                        // if (_gameid !== "8021" && _gameid !== "0000") return true; // continue

                        _.forOwn(_scenedata, function(_onlineusercount, _scenename) {
                            // if (_scenename === "RULE_VIEW")
                            //     return true; // continue
                            // if (_scenename === "FEEDBACK_VIEW")
                            //     return true; // continue

                            // if (_scenename !== "GAME_VIEW" && _scenename !== "LOGIN_VIEW")
                            //     return true; // continue

                            var scene = _scenename;
                            if (_scenename === "GAME_VIEW")
                                scene = _scenename + "_" + _gameid;

                            if (!_.includes(listSceneName, scene)) {
                                // contains
                                listSceneName.push(scene);
                            }

                            if (viewangle.selectedView == 'all') {
                                if (!_.has(item, 'ccu')) item['ccu'] = 0;
                                item['ccu'] += _onlineusercount;
                            } else if (viewangle.selectedView == 'gamescene') {
                                // loc theo viewangle
                                if (!_.isEmpty(viewangle.sceneList) && !viewangle.sceneList[scene])
                                    return true; // continue

                                if (!_.has(item, scene)) item[scene] = 0;
                                item[scene] += _onlineusercount;
                            } else { // gameserver
                                // loc theo viewangle
                                if (!_.isEmpty(viewangle.serverList) && !viewangle.serverList[_ipadd])
                                    return true; // continue

                                if (!_.has(item, _ipadd)) item[_ipadd] = 0;
                                item[_ipadd] += _onlineusercount;
                            }

                        });

                    });
                });
            }

            var drawSVG = function(data) {
                d3.select("#svgcontainer").select("svg").remove();
                svg = d3.select("#svgcontainer").append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


                color.domain(d3.keys(data[0]).filter(function(key) {
                    return key !== "date";
                }));

                var gamescenes = color.domain().map(function(name) {
                    return {
                        name: name,
                        values: data.map(function(d) {
                            return {
                                date: d.date,
                                user_count: +d[name]
                            };
                        })
                    };
                });

                // console.log(gamescenes);

                x.domain(d3.extent(data, function(d) {
                    return d.date;
                }));
                y.domain([
                    d3.min(gamescenes, function(c) {
                        return 0;
                        // return d3.min(c.values, function(v) {
                        //     return v.user_count;
                        // });
                    }),
                    d3.max(gamescenes, function(c) {
                        return d3.max(c.values, function(v) {
                            return (Math.floor(v.user_count / 200) + 1) * 200;
                        });
                    })
                ]);
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);
                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text("User Count");
                var gamescene = svg.selectAll(".gamescene")
                    .data(gamescenes)
                    .enter().append("g")
                    .attr("class", "gamescene");
                gamescene.append("path")
                    .attr("class", "line")
                    .attr("d", function(d) {
                        return line(d.values);
                    })
                    .style("stroke", function(d) {
                        return color(d.name);
                    });
                gamescene.append("text")
                    .datum(function(d) {
                        return {
                            name: d.name,
                            value: d.values[d.values.length - 1]
                        };
                    })
                    .attr("transform", function(d) {
                        if (_.isNaN(d.value.user_count)) d.value.user_count = 0;
                        return "translate(" + x(d.value.date) + "," + y(d.value.user_count) + ")";
                    })
                    .attr("x", 3)
                    .attr("dy", ".35em")
                    .text(function(d) {
                        return d.name;
                    });
            }

            return {
                init: function(_viewangle, _datasource) {
                    viewangle = _viewangle;
                    datasource = _datasource;

                    margin = {
                        top: 20,
                        right: 120,
                        bottom: 30,
                        left: 56
                    };
                    width = 1020 - margin.left - margin.right;
                    height = 600 - margin.top - margin.bottom;
                    x = d3.time.scale()
                        .range([0, width]);
                    y = d3.scale.linear()
                        .range([height, 0]);
                    color = d3.scale.category20();
                    xAxis = d3.svg.axis()
                        .scale(x)
                        .orient("bottom");
                    yAxis = d3.svg.axis()
                        .scale(y)
                        .orient("left");
                    line = d3.svg.line()
                        .interpolate("basis")
                        .defined(function(d) {
                            // console.log(d); 
                            return !isNaN(d.user_count);
                        })
                        .x(function(d) {
                            return x(d.date);
                        })
                        .y(function(d) {
                            return y(d.user_count);
                        });
                    // .defined(function(d) { return d.y!=null; });
                },
                setDist: function(_jsondata) {
                    _.extend(distsInfo, _jsondata);
                },
                updateView: function(_viewangle, _datasource) {
                    if (!_.isEmpty(_viewangle)) { viewangle = _viewangle; } else { console.log('using default viewangle') }
                    if (!_.isEmpty(_datasource)) { datasource = _datasource; } else { console.log('using default datasource') }
                    // console.log('viewangle: ' + JSON.stringify(viewangle));
                    // console.log('datasource: ' + JSON.stringify(datasource));

                    var data = prepareData();

                    // The main draw SVG
                    drawSVG(data);
                },
                fillData: function(_jsondata, _samplestep) {
                    if (Array.isArray(_jsondata) && _jsondata.length > 0) {
                        jsondata = _jsondata;
                        samplestep = _samplestep;
                    } else {
                        console.log('something wrong.')
                        alert('no data');
                        return;
                    }

                    // console.log('viewangle: ' + JSON.stringify(viewangle));
                    // console.log('datasource: ' + JSON.stringify(datasource));
                    viewangle.selectedViewTimeRange.start = null;
                    viewangle.selectedViewTimeRange.end = null;
                    var data = prepareData();

                    // The main draw SVG
                    // note: tạm thời ko cần draw lúc này, chỉ cần prepareData là đủ.
                    // vì datepicker sẽ chạy và gọi hàm updateView
                    // update: vẫn cần để vì khi dữ liệu đổ về từ socketio do ng dùng tự cập nhật
                    drawSVG(data);
                }
            }

        }]);

})();
