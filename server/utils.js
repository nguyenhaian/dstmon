exports.gettype10popup = (app, type10Popups, gameid, gold, vip, stake) => {
    if (gold < stake * 10) {
        // đáng lẽ phải xét theo game nữa.
        var data = type10Popups[app];
        if (!data)
            return [];

        return data;
    }

    return [];
}
