d3.json("loadconfig.json", function(error, records) {
    function splitarr(rawarr) {
        var rarr = [];

        function splitobj(rawobj) {
            var objs = [];
            var props = ['r1', 'r2', 'r3', 'r4', 'r5', 'd1r1', 'd1r2', 'd1r3', 'd1r4', 'd1r5', 'd2r1', 'd2r2', 'd2r3', 'd2r4', 'd2r5'];
            props.forEach(function(r) {
                if (rawobj[r]) {
                    objs.push({
                        delay: r,
                        value: +rawobj[r],
                        date: new Date(rawobj.time),
                        os: rawobj.os,
                        bundle: rawobj.bundle,
                        op: +rawobj.op
                    });
                }
            });
            return objs;
        }

        rawarr.forEach(function(rawobj) {
            Array.prototype.push.apply(rarr, splitobj(rawobj));
        });
        return rarr;
    }

    // format records data
    records = splitarr(records);
    // console.log('records: ' + records.length)
    console.log(records[0])

    // Various formatters.
    var formatNumber = d3.format(",d"),
        formatChange = d3.format("+,d"),
        formatDate = d3.time.format("%B %d, %Y"),
        formatTime = d3.time.format("%I:%M %p");

    // A nest operator, for grouping the record list.
    var nestByDate = d3.nest()
        .key(function(d) {
            return d3.time.day(d.date);
        });

    // A little coercion, since the CSV is untyped.
    // records.forEach(function(d, i) {
    //     d.index = i;
    //     d.date = d.date; //parseDate(d.date);
    //     d.delay = +d.delay;
    //     d.op = +d.op;
    // });

    // {
    //     r: 'r1',
    //     value: 2,
    //     time: '2016-07-15T07:58:55.193Z',
    //     os: '',
    //     bundle: '',
    //     op: 500
    // }

    // Create the crossfilter for the relevant dimensions and groups.
    var record = crossfilter(records),
        all = record.groupAll(),
        date = record.dimension(function(d) {
            return d.date;
        }),
        dates = date.group(d3.time.day),
        hour = record.dimension(function(d) {
            return d.date.getHours() + d.date.getMinutes() / 60;
        }),
        hours = hour.group(Math.floor),
        delay = record.dimension(function(d) {
            return d.delay;
        }),
        delays = delay.group(),
        op = record.dimension(function(d) {
            return d.op;
        }),
        ops = op.group();

    console.log('date ' + JSON.stringify(date.top(1)[0]))
    console.log('dates ' + JSON.stringify(dates.top(1)[0]))
    console.log(dates.size())
    console.log('hour ' + JSON.stringify(hour.top(1)[0]))
    console.log('hours ' + JSON.stringify(hours.top(1)[0]))
    console.log(hours.size())
    console.log('delay ' + JSON.stringify(delay.top(1)[0]))
    console.log('delays ' + JSON.stringify(delays.top(1)[0]))
    console.log(delays.size())
    console.log('op ' + JSON.stringify(op.top(1)[0]))
    console.log('ops ' + JSON.stringify(ops.top(1)[0]))
    console.log(ops.size())

    // var yScale = d3.scale.ordinal().domain(d3.range(26).map(function(d) {
    //     return alphabet.charAt(d)
    // })).rangePoints([0, 500], 1);
    // var axis = d3.svg.axis().scale(yScale).tickSize(5).orient("right"),
    //     brushed = function() {
    //         var selected = yScale.domain().filter(function(d) {
    //             return (brush.extent()[0] <= yScale(d)) && (yScale(d) <= brush.extent()[1])
    //         });
    //         d3.select(".selected").text(selected.join(","));
    //     },
    //     brush = d3.svg.brush().y(yScale).on("brush", brushed);

    var charts = [
        barChart()
        .dimension(hour)
        .group(hours)
        .barwidth(9)
        .chartwidth(240)
        .x(d3.scale.linear()
            .domain([0, 24])
            .rangeRound([0, 10 * 24])),

        barChart()
        .dimension(delay)
        .group(delays)
        .barwidth(9)
        .chartwidth(10 * delays.size())
        .x(d3.scale.ordinal()
            .domain(delays.all().map(function(d) {
                return d.key
            }))
            .rangeBands([0, 10 * delays.size()])),

        barChart()
        .dimension(op)
        .group(ops)
        .barwidth(48)
        .chartwidth(50 * ops.size())
        .x(d3.scale.ordinal()
            .domain(ops.all().map(function(d) {
                return d.key
            }))
            .rangeBands([0, 50 * ops.size()])),

        barChart()
        .dimension(date)
        .group(dates)
        .barwidth(48)
        .chartwidth(50 * dates.size())
        .round(d3.time.day.round)
        .x(d3.time.scale()
            .domain(d3.extent(dates.all().map(function(d) {
                return d.key
            })), function(d) {
                // normally we would check across all our layers,
                // but we can "cheat" and use `sales[0].values`
                // since we know all layers have the same domain
                return d.date;
            })
            .rangeRound([0, 50 * dates.size() / 2])) // TODO: rất khổ với cái đoạn này, hàm x của time.scale bị sao sao ấy.
        // .filter([new Date(2001, 1, 1), new Date(2001, 2, 1)])

    ];

    // Given our array of charts, which we assume are in the same order as the
    // .chart elements in the DOM, bind the charts to the DOM and render them.
    // We also listen to the chart's brush events to update the display.
    var chart = d3.selectAll(".chart")
        .data(charts)
        .each(function(chart) {
            chart.on("brush", renderAll).on("brushend", renderAll);
        });

    // Render the initial lists.
    var list = d3.selectAll(".list")
        .data([recordList]);

    // Render the total.
    d3.selectAll("#total")
        .text(formatNumber(record.size()));

    renderAll();

    // Renders the specified chart or list.
    function render(method) {
        d3.select(this).call(method);
    }

    // Whenever the brush moves, re-rendering everything.
    function renderAll() {
        // .c1
        // list.each(render);
        // chart.each(render);

        // .c2
        list.each(function(method, index) {
            // console.log('index: ' + index);
            d3.select(this).call(method);
            // call <=> method(d3.select(this))
            // method ở đây chính là data item. Đậu, tởm vãi.
            // cụ thể là recordList<div>, div = d3.select(this)
        });
        chart.each(function(method, index) {
            // console.log('method ' + index)
            d3.select(this).call(method);
        });

        // .c3
        // recordList(d3.select('.list'));

        d3.select("#active").text(formatNumber(all.value()));
    }

    // Like d3.time.format, but faster.
    function parseDate(d) {
        return new Date(2001,
            d.substring(0, 2) - 1,
            d.substring(2, 4),
            d.substring(4, 6),
            d.substring(6, 8));
    }

    window.filter = function(filters) {
        filters.forEach(function(d, i) {
            charts[i].filter(d);
        });
        renderAll();
    };

    window.reset = function(i) {
        charts[i].filter(null);
        renderAll();
    };

    function recordList(div) {
        var recordsByDate = nestByDate.entries(date.top(40));
        // console.log(recordsByDate);
        div.each(function() {
            var date = d3.select(this).selectAll(".date")
                .data(recordsByDate, function(d) {
                    return d.key;
                });

            date.enter().append("div")
                .attr("class", "date")
                .append("div")
                .attr("class", "day")
                .text(function(d) {
                    return formatDate(d.values[0].date);
                });

            date.exit().remove();

            var record = date.order().selectAll(".record")
                .data(function(d) {
                    return d.values;
                }, function(d) {
                    return d.index;
                });

            var recordEnter = record.enter().append("div")
                .attr("class", "record");

            recordEnter.append("div")
                .attr("class", "time")
                .text(function(d) {
                    return d.date;
                });

            recordEnter.append("div")
                .attr("class", "origin")
                .text(function(d) {
                    return d.os;
                });

            recordEnter.append("div")
                .attr("class", "destination")
                .text(function(d) {
                    return d.bundle;
                });

            recordEnter.append("div")
                .attr("class", "op")
                .text(function(d) {
                    return formatNumber(d.op) + " mi.";
                });

            recordEnter.append("div")
                .attr("class", "delay")
                .classed("early", function(d) {
                    return d.delay < 0;
                })
                .text(function(d) {
                    return d.delay + " min.";
                });

            record.exit().remove();

            record.order();
        });
    }

    function barChart() {
        if (!barChart.id) barChart.id = 0;

        var margin = {
                top: 10,
                right: 10,
                bottom: 20,
                left: 10
            },
            x,
            y = d3.scale.linear().range([100, 0]),
            id = barChart.id++,
            axis = d3.svg.axis().orient("bottom"),
            brush = d3.svg.brush(),
            brushDirty,
            dimension,
            group,
            barwidth,
            chartwidth,
            round;

        function chart(div) {
            var width = chartwidth; //x.range()[x.range().length - 1],
            height = y.range()[0];

            y.domain([0, group.top(1)[0].value]);

            div.each(function() {
                var div = d3.select(this),
                    g = div.select("g");

                // Create the skeletal chart.
                if (g.empty()) {
                    div.select(".title").append("a")
                        .attr("href", "javascript:reset(" + id + ")")
                        .attr("class", "reset")
                        .text("reset")
                        .style("display", "none");

                    g = div.append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    g.append("clipPath")
                        .attr("id", "clip-" + id)
                        .append("rect")
                        .attr("width", width)
                        .attr("height", height);

                    g.selectAll(".bar")
                        .data(["background", "foreground"])
                        .enter().append("path")
                        .attr("class", function(d) {
                            return d + " bar";
                        })
                        .datum(group.all());

                    g.selectAll(".foreground.bar")
                        .attr("clip-path", "url(#clip-" + id + ")");

                    g.append("g")
                        .attr("class", "axis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(axis);

                    // Initialize the brush component with pretty resize handles.
                    var gBrush = g.append("g").attr("class", "brush").call(brush);
                    gBrush.selectAll("rect").attr("height", height);
                    gBrush.selectAll(".resize").append("path").attr("d", resizePath);

                    // console.log(group.all())
                }

                // Only redraw the brush if set externally.
                if (brushDirty) {
                    brushDirty = false;
                    g.selectAll(".brush").call(brush);
                    div.select(".title a").style("display", brush.empty() ? "none" : null);
                    if (brush.empty()) {
                        g.selectAll("#clip-" + id + " rect")
                            .attr("x", 0)
                            .attr("width", width);
                    } else {
                        var extent = brush.extent();
                        g.selectAll("#clip-" + id + " rect")
                            .attr("x", x(extent[0]))
                            .attr("width", x(extent[1]) - x(extent[0]));
                    }
                }

                g.selectAll(".bar").attr("d", barPath);
            });

            function barPath(groups) {
                var path = [],
                    i = -1,
                    n = groups.length,
                    d;
                while (++i < n) {
                    d = groups[i];
                    path.push("M", x(d.key), ",", height, "V", y(d.value), "h", barwidth, "V", height);
                    // if (groups.length = 2)
                    //     new Error('groups.length = 2')
                    // console.log(d)
                }
                return path.join("");
            }

            function resizePath(d) {
                var e = +(d == "e"),
                    x = e ? 1 : -1,
                    y = height / 3;
                return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) + "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
            }
        }

        brush.on("brushstart.chart", function() {
            var div = d3.select(this.parentNode.parentNode.parentNode);
            div.select(".title a").style("display", null);
        });

        brush.on("brush.chart", function() {
            var g = d3.select(this.parentNode),
                extent = brush.extent(),
                isOrdinal = (typeof x.rangePoints === "function"); // -> mẹo để xác định ordinal

            // check ordinal scale
            // Todo: ordinal phải làm khác linear ######
            if (isOrdinal) {
                var extent = x.domain().filter(function(d) {
                    if (!d) return false;
                    return (brush.extent()[0] < (x(d) + barwidth / 2)) && ((x(d) + barwidth / 2) < brush.extent()[1])
                });
            }

            console.log(extent);
            if (round) g.select(".brush") // -> nên round delay lại
                .call(brush.extent(extent = extent.map(round)))
                .selectAll(".resize")
                .style("display", null);
            g.select("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));

            if (isOrdinal) {
                dimension.filter(function(d) {
                    return extent.indexOf(d) > -1;
                });
                // dimension.filterFunction(function(d) {
                //     return extent.includes(d)
                // });
            } else {
                dimension.filterRange(extent); // đối với ordinal scale, phải lấy đúng extent mới đc.
            }
        });

        brush.on("brushend.chart", function() {
            if (brush.empty()) {
                var div = d3.select(this.parentNode.parentNode.parentNode);
                div.select(".title a").style("display", "none");
                div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
                dimension.filterAll();
            }
        });

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin = _;
            return chart;
        };

        chart.x = function(_) {
            if (!arguments.length) return x;
            x = _;
            axis.scale(x);
            brush.x(x);
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return y;
            y = _;
            return chart;
        };

        chart.dimension = function(_) {
            if (!arguments.length) return dimension;
            dimension = _;
            // console.log(dimension.top(1)[0])
            return chart;
        };

        chart.filter = function(_) {
            if (_) {
                brush.extent(_);
                dimension.filterRange(_);
            } else {
                brush.clear();
                dimension.filterAll();
            }
            brushDirty = true;
            return chart;
        };

        chart.group = function(_) {
            if (!arguments.length) return group;
            group = _;
            return chart;
        };

        chart.barwidth = function(_) {
            if (!arguments.length) return barwidth;
            barwidth = _;
            return chart;
        };
        chart.chartwidth = function(_) {
            if (!arguments.length) return chartwidth;
            chartwidth = _;
            return chart;
        };

        chart.round = function(_) {
            if (!arguments.length) return round;
            round = _;
            return chart;
        };

        return d3.rebind(chart, brush, "on");
    }
});
