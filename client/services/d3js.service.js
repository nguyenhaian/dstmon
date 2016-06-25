(function() {
    'use strict';

    angular
        .module('chartApp')
        .factory('d3s', ['$rootScope', function($rootScope) {
            // rawdata and viewoptions variables
            var jsondata = [];
            var jsonLoginData = [];
            var samplestep = 30 * 1;
            var viewangle = {};
            var datasource = {};
            var distsInfo = {};

            // the div we insert the graph into
            var container;
            // svg variables
            var margin, width, height, x, y, color, xAxis, yAxis, line, svg, maxY;
            var hoverContainer, hoverLine, hoverLineXOffset, hoverLineYOffset, hoverLineGroup;

            // used to track if the user is interacting via mouse/finger instead of trying to determine
            // by analyzing various element class names to see if they are visible or not
            var userCurrentlyInteracting = false;
            var currentUserPositionX = -1;

            // var parseDate = d3.time.format("%d-%m-%Y %H:%M:%S").parse; //"09-05-2016 11:56:10"

            var mongoParseDate = function(_id) {
                return moment(parseInt(_id.substring(0, 8), 16) * 1000);
            }

            // prepareData: format data từ jsondata, do dó phải set jsondata trước
            var prepareData = function(jsondata, samplestep, viewangle, datasource, distsInfo) {
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
                console.log('renderPoints: ' + renderPoints);
                console.log('render step min: ' + samplestep + '(s)');
                var maxRenderPoint = width / 1; // 1 pixel một mẫu
                // ->
                var renderstep = Math.floor(renderPoints / maxRenderPoint) + 1;

                console.log('render step: ' + renderstep + '|' + (renderstep * samplestep) + '(s)');

                daterange.start = mongoParseDate(jsondata[jsondata.length - 1]._id);
                daterange.end = mongoParseDate(jsondata[0]._id);

                updateDateRangeViewAngle(daterange);

                for (var i = jsondata.length - 1; i >= 0; i -= renderstep) {
                    var _item = jsondata[i];
                    var item = { date: mongoParseDate(_item._id) };

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

                        // thêm các trường ở viewangle vào item
                        produceDataItem(viewangle, _dist, distsInfo[_distid], item, listSceneName, listIPAddress);
                    });

                    // console.log(JSON.stringify(item))
                    data.push(item);
                };

                // fill data to rows 1
                if (viewangle.selectedView == viewangle.list.all) {
                    // do nothing
                } else if (viewangle.selectedView == viewangle.list.gamescene) {
                    _.forEach(listSceneName, function(value) {
                        if (!_.has(data[0], value)) {
                            data[0][value] = 0;
                        }
                    })
                } else { // gameserver
                    _.forEach(listIPAddress, function(value) {
                        if (!_.has(data[0], value)) {
                            data[0][value] = 0;
                        }
                    })
                }

                // console.log(viewangle.sceneList);
                console.log('data[0]:' + JSON.stringify(data[0]));
                // console.log('data[1]:' + JSON.stringify(data[1]));
                // console.log('data[2]:' + JSON.stringify(data[2]));

                return data;
            }

            // prepareData: format data từ jsondata, do dó phải set jsondata trước
            var prepareData2 = function(jsondata, samplestep, viewangle, datasource, distsInfo) {
                var data = [],
                    listSceneName = [],
                    listIPAddress = [],
                    daterange = {};
                var renderPoints = jsondata.length; // tính theo % số điểm đc render trên tổng bộ dữ liệu totalPoints
                console.log('renderPoints: ' + renderPoints);
                console.log('render step min: ' + samplestep + '(s)');
                var maxRenderPoint = width / 1; // 1 pixel một mẫu
                // ->
                var renderstep = Math.floor(renderPoints / maxRenderPoint) + 1;
                renderstep = 1;

                console.log('render step: ' + renderstep + '|' + (renderstep * samplestep) + '(s)');

                daterange.start = mongoParseDate(jsondata[jsondata.length - 1]._id);
                daterange.end = mongoParseDate(jsondata[0]._id);

                updateDateRangeViewAngle(daterange);

                var success = 0;
                var failed = 0;
                var AST = 0;
                var MST = 0;
                var minST = 1000;
                var AFT = 0;
                var MFT = 0;
                var minFT = 1000;

                for (var i = jsondata.length - 1; i >= 0; i -= renderstep) {
                    var _item = jsondata[i];
                    var item = { date: mongoParseDate(_item._id) };

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

                        // thêm 120 dữ liệu thành một dữ liệu trung bình - tương ứng 1 hour, cho các dữ liệu về thời gian login
                        // 2. xử lý thông tin login time average
                        // console.log('_dist')
                        AST = (AST * success + _dist.successTime * _dist.success) / (success + _dist.success);
                        success += _dist.success;
                        failed += _dist.failed;

                        if (MST < _dist.maxST) MST = _dist.maxST;
                        if ((minST > _dist.minST) && _dist.minST > 0) minST = _dist.minST;
                        // if (!_.has(item, 'FT')) item['FT'] = _dist.failedTime;
                        // item['maxFT'] = undefined;
                    });

                    if (i % 12 == 0) {
                        item['success'] = success;
                        item['failed'] = failed;
                        item['AST'] = AST;
                        item['MST'] = MST;
                        item['minST'] = minST;
                        item['failed_rate'] = success ? ((failed / (success + failed)) * 100) : 0;

                        // reset
                        success = 0;
                        failed = 0;
                        AST = 0;
                        MST = 0;
                        minST = 100;
                        AFT = 0;
                        MFT = 0;
                        minFT = 100;

                        data.push(item);
                    }
                };

                // fill data to rows 1
                if (viewangle.selectedView == viewangle.list.all) {
                    // do nothing
                } else if (viewangle.selectedView == viewangle.list.gamescene) {
                    _.forEach(listSceneName, function(value) {
                        if (!_.has(data[0], value)) {
                            data[0][value] = 0;
                        }
                    })
                } else { // gameserver
                    _.forEach(listIPAddress, function(value) {
                        if (!_.has(data[0], value)) {
                            data[0][value] = 0;
                        }
                    })
                }
                // fill logininfo
                if (!data[0]['success']) data[0]['success'] = 0;
                if (!data[0]['failed']) data[0]['failed'] = 0;
                if (!data[0]['AST']) data[0]['AST'] = 0;
                if (!data[0]['MST']) data[0]['MST'] = 0;
                if (!data[0]['minST']) data[0]['minST'] = 0;

                // console.log(viewangle.sceneList);
                console.log('data2[0]:' + JSON.stringify(data[0]));
                console.log('data2.length:' + data.length);

                return data;
            }

            var updateDateRangeViewAngle = function(daterange) {
                // 4. update viewangle về cho view controller
                $rootScope.$broadcast('d3s.updateDateRangeViewAngle', daterange);
            }

            var produceDataItem = function(viewangle, _dist, distinfo, item, listSceneName, listIPAddress) {
                // 1. xử lý thông tin ccu
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
                                
                                if (!_.has(item, distinfo.op)) item[distinfo.op] = 0;
                                item[distinfo.op] += _onlineusercount;
                                
                                if (!_.has(item, distinfo.os)) item[distinfo.os] = 0;
                                item[distinfo.os] += _onlineusercount;
                                
                                if (!_.has(item, distinfo.bundle)) item[distinfo.bundle] = 0;
                                item[distinfo.bundle] += _onlineusercount;

                            } else if (viewangle.selectedView == 'gamescene') {
                                if (!_.has(item, scene)) item[scene] = 0;
                                item[scene] += _onlineusercount;
                            } else { // gameserver
                                if (!_.has(item, _ipadd)) item[_ipadd] = 0;
                                item[_ipadd] += _onlineusercount;
                            }

                        });

                    });
                });
            }

            var findMaxY = function(data) { // Define function "findMaxY"
                var maxYValues = data.map(function(d) {
                    if (d.visible) {
                        return d3.max(d.values, function(value) { // Return max rating value
                            return value.user_count;
                        })
                    }
                });
                return d3.max(maxYValues);
            }

            /**
             * Called when a user mouses over a line.
             */
            var handleMouseOverLine = function(lineData, index) {
                    //debug("MouseOver line [" + containerId + "] => " + index)
                    console.log("MouseOver line [" + index + "]");
                    console.log(lineData);

                    // user is interacting
                    // userCurrentlyInteracting = true;
                }
                /**
                 * Called when a user mouses over the graph.
                 */
            var handleMouseOverGraph = function(event) {
                var mouseX = event.pageX - hoverLineXOffset;
                var mouseY = event.pageY - hoverLineYOffset;
                if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
                    // show the hover line
                    hoverLine.classed("hide", false);

                    // set position of hoverLine
                    hoverLine.attr("x1", mouseX).attr("x2", mouseX)

                    displayValueLabelsForPositionX(mouseX);
                    // user is interacting
                    userCurrentlyInteracting = true;
                    currentUserPositionX = mouseX;
                } else {
                    // proactively act as if we've left the area since we're out of the bounds we want
                    handleMouseOutGraph(event)
                }
            }


            var handleMouseOutGraph = function(event) {
                // hide the hover-line
                hoverLine.classed("hide", true);

                setValueLabelsToLatest();

                //debug("MouseOut graph [" + containerId + "] => " + mouseX + ", " + mouseY)

                // user is no longer interacting
                userCurrentlyInteracting = false;
                currentUserPositionX = -1;
            }

            /**
             * Display the data values at position X in the legend value labels.
             */
            var displayValueLabelsForPositionX = function(posX, withTransition) {

                var animate = false;
                if (withTransition != undefined) {
                    if (withTransition) {
                        animate = true;
                    }
                }
                var dateToShow;
                svg.selectAll(".line_group").select(".legend")
                    .text(function(d, i) {
                        var relPos = posX / width;
                        var dataindex = Math.round(relPos * (d.values.length - 1));

                        if (i == 0) {
                            dateToShow = moment(d.values[dataindex].date)._d; // chỉ lấy 1 lần, vì bị lặp lại theo số lines.
                        }
                        return '[' + d.name.substring(0,20) + '] ' + d.values[dataindex].user_count;
                    })

                // show the date
                svg.select('text.date-label').text(dateToShow.toDateString() + " " + dateToShow.toLocaleTimeString())
            }


            /**
             * Set the value labels to whatever the latest data point is.
             */
            var setValueLabelsToLatest = function(withTransition) {
                displayValueLabelsForPositionX(width, withTransition);
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

                var gamescenes = color.domain().map(function(name, index) {
                    return {
                        name: name,
                        values: data.map(function(d) {
                            return {
                                date: d.date,
                                user_count: +d[name]
                            };
                        }),
                        // visible: ((name === "AST" || name == "failed_rate") ? true : false)
                        visible: ((index == 0) ? true : false)
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
                            // return (Math.floor(v.user_count / 200) + 1) * 200;
                            return v.user_count;
                            // return 100;
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

                svg.append("g")
                    .attr("class", "date-label-group")
                    .append("text")
                    .attr("class", "date-label")
                    .attr("text-anchor", "end") // set at end so we can position at far right edge and add text from right to left
                    .attr("font-size", "10")
                    .attr("y", -4)
                    .attr("x", width)
                    .text(new Date().toDateString() + " " + new Date().toLocaleTimeString())

                var linesGroup = svg.selectAll(".line_group")
                    .data(gamescenes)
                    .enter().append("g")
                    .attr("class", "line_group");
                linesGroup.append("path")
                    .attr("class", "line")
                    .style("pointer-events", "none")
                    .attr("id", function(d) {
                        return "line-" + d.name.replace(" ", "").replace("/", ""); // Give line id of line-(insert issue name, with any spaces replaced with no spaces)
                    })
                    .attr("d", function(d) {
                        return d.visible ? line(d.values) : null;
                    })
                    .attr("clip-path", "url(#clip)") //use clip path to make irrelevant part invisible
                    .on('mouseover', function(d, i) {
                        handleMouseOverLine(d, i);
                    })
                    .style("stroke", function(d) {
                        return color(d.name);
                    });

                $(container).mouseleave(function(event) {
                    handleMouseOutGraph(event);
                })

                $(container).mousemove(function(event) {
                    handleMouseOverGraph(event);
                })

                // add a 'hover' line that we'll show as a user moves their mouse (or finger)
                // so we can use it to show detailed values of each line
                hoverLineGroup = svg.append("g")
                    .attr("class", "hover-line");
                // add the line to the group
                hoverLine = hoverLineGroup
                    .append("svg:line")
                    .attr("x1", 10).attr("x2", 10) // vertical line so same value on each
                    .attr("y1", 0).attr("y2", height); // top to bottom  

                // hide it by default
                hoverLine.classed("hide", true);

                linesGroup.append("rect")
                    .attr("width", 10)
                    .attr("height", 10)
                    .attr("x", width + 3)
                    .attr("y", function(d, i) {
                        return (i * 20)
                    }) // spacing
                    .attr("fill", function(d) {
                        return d.visible ? color(d.name) : "#F1F1F2"; // If array key "visible" = true then color rect, if not then make it grey 
                    })
                    .attr("class", "legend-box")

                .on("click", function(d) { // On click make d.visible 
                    d.visible = !d.visible; // If array key for this data selection is "visible" = true then make it false, if false then make it true

                    maxY = findMaxY(gamescenes); // Find max Y rating value gamescenes data with "visible"; true
                    y.domain([0, maxY]); // Redefine yAxis domain based on highest y value of gamescenes data with "visible"; true
                    svg.select(".y.axis")
                        .transition()
                        .call(yAxis);

                    linesGroup.select("path")
                        .transition()
                        .attr("d", function(d) {
                            return d.visible ? line(d.values) : null; // If d.visible is true then draw line for this d selection
                        })

                    linesGroup.select("rect")
                        .transition()
                        .attr("fill", function(d) {
                            return d.visible ? color(d.name) : "#F1F1F2";
                        });
                })

                .on("mouseover", function(d) {

                    d3.select(this)
                        .transition()
                        .attr("fill", function(d) {
                            return color(d.name);
                        });

                    d3.select("#line-" + d.name.replace(" ", "").replace("/", ""))
                        .transition()
                        .style("stroke-width", 2.5);
                })

                .on("mouseout", function(d) {

                    d3.select(this)
                        .transition()
                        .attr("fill", function(d) {
                            return d.visible ? color(d.name) : "#F1F1F2";
                        });

                    d3.select("#line-" + d.name.replace(" ", "").replace("/", ""))
                        .transition()
                        .style("stroke-width", 1.5);
                })

                linesGroup.append("text")
                    .attr("class", "legend")
                    .attr("x", width + 18)
                    .attr("y", function(d, i) {
                        return 20 * i + 9;
                    })
                    // .attr("dy", ".35em")
                    .text(function(d) {
                        return d.name.substring(0,25);
                    })
                    .style("fill", function(d) {
                        return color(d.name);
                    });
            }

            return {
                init: function(_viewangle, _datasource) {
                    viewangle = _viewangle;
                    datasource = _datasource;

                    margin = {
                        top: 20,
                        right: 200,
                        bottom: 30,
                        left: 56
                    };
                    width = 920 - margin.left - margin.right;
                    height = 412 - margin.top - margin.bottom;
                    x = d3.time.scale()
                        .range([0, width]);
                    y = d3.scale.linear()
                        .range([height, 0]);
                    color = d3.scale.category20();

                    xAxis = d3.svg.axis().scale(x).tickSize(-height).tickSubdivide(1).orient("bottom");

                    yAxis = d3.svg.axis().scale(y).orient("left");

                    line = d3.svg.line()
                        // .interpolate("basis")
                        .interpolate("monotone")
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

                    container = document.querySelector('#svgcontainer');

                    hoverLineXOffset = margin.left + $(container).offset().left;
                    hoverLineYOffset = margin.top + $(container).offset().top;

                    $('.rg-range-picker').css({ "max-width": width });
                },
                setDist: function(_jsondata) {
                    _.extend(distsInfo, _jsondata);

                    for (var i = distsInfo.length - 1; i >= 0; i--) {
                        distsInfo[i].bundle = distsInfo[i].bundle.replace(/\;$/, '').replace(/\./g, '_');
                    };
                },
                updateView: function(_viewangle, _datasource) {
                    console.log('updateView');
                    if (!_.isEmpty(_viewangle)) { viewangle = _viewangle; } else { console.log('using default viewangle') }
                    if (!_.isEmpty(_datasource)) { datasource = _datasource; } else { console.log('using default datasource') }
                    // console.log('viewangle: ' + JSON.stringify(viewangle));
                    // console.log('datasource: ' + JSON.stringify(datasource));

                    // var data = prepareData2(jsonLoginData, samplestep, viewangle, datasource, distsInfo);
                    var data = prepareData(jsondata, samplestep, viewangle, datasource, distsInfo);

                    // The main draw SVG
                    drawSVG(data);
                },
                updateXScale: function(selectedViewTimeRange) {
                    console.log('updateXScale');
                    x.domain([selectedViewTimeRange.start, selectedViewTimeRange.end]);

                    svg.selectAll(".x.axis").transition().call(xAxis);
                    svg.selectAll(".line_group").select("path")
                        .transition()
                        .attr("d", function(d) {
                            return d.visible ? line(d.values) : null; // If d.visible is true then draw line for this d selection
                        })
                },
                fillTimeLineData: function(_jsondata, _samplestep) {
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
                    var data = prepareData(jsondata, samplestep, viewangle, datasource, distsInfo);

                    // The main draw SVG
                    // note: tạm thời ko cần draw lúc này, chỉ cần prepareData là đủ.
                    // vì datepicker sẽ chạy và gọi hàm updateView
                    // update: vẫn cần để vì khi dữ liệu đổ về từ socketio do ng dùng tự cập nhật
                    drawSVG(data);
                },
                fillLoginData: function(_jsondata) {
                    if (Array.isArray(_jsondata) && _jsondata.length > 0) {
                        jsonLoginData = _jsondata;
                    } else {
                        console.log('something wrong.')
                        alert('no data');
                        return;
                    }

                    // console.log('viewangle: ' + JSON.stringify(viewangle));
                    // console.log('datasource: ' + JSON.stringify(datasource));
                    // samplestep: 300s = 5m
                    var data = prepareData2(jsonLoginData, 300, viewangle, datasource, distsInfo);

                    // The main draw SVG
                    // note: tạm thời ko cần draw lúc này, chỉ cần prepareData là đủ.
                    // vì datepicker sẽ chạy và gọi hàm updateView
                    // update: vẫn cần để vì khi dữ liệu đổ về từ socketio do ng dùng tự cập nhật
                    drawSVG(data);
                }
            }

        }]);

})();
