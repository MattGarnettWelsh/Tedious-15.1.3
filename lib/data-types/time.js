"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _writableTrackingBuffer = _interopRequireDefault(require("../tracking-buffer/writable-tracking-buffer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const NULL_LENGTH = Buffer.from([0x00]);
const Time = {
  id: 0x29,
  type: 'TIMEN',
  name: 'Time',
  declaration: function (parameter) {
    return 'time(' + this.resolveScale(parameter) + ')';
  },
  resolveScale: function (parameter) {
    if (parameter.scale != null) {
      return parameter.scale;
    } else if (parameter.value === null) {
      return 0;
    } else {
      return 7;
    }
  },

  generateTypeInfo(parameter) {
    return Buffer.from([this.id, parameter.scale]);
  },

  generateParameterLength(parameter, options) {
    if (parameter.value == null) {
      return NULL_LENGTH;
    }

    switch (parameter.scale) {
      case 0:
      case 1:
      case 2:
        return Buffer.from([0x03]);

      case 3:
      case 4:
        return Buffer.from([0x04]);

      case 5:
      case 6:
      case 7:
        return Buffer.from([0x05]);

      default:
        throw new Error('invalid scale');
    }
  },

  *generateParameterData(parameter, options) {
    if (parameter.value == null) {
      return;
    }

    const buffer = new _writableTrackingBuffer.default(16);
    const time = parameter.value;
    let timestamp;

    if (options.useUTC) {
      timestamp = ((time.getUTCHours() * 60 + time.getUTCMinutes()) * 60 + time.getUTCSeconds()) * 1000 + time.getUTCMilliseconds();
    } else {
      timestamp = ((time.getHours() * 60 + time.getMinutes()) * 60 + time.getSeconds()) * 1000 + time.getMilliseconds();
    }

    timestamp = timestamp * Math.pow(10, parameter.scale - 3);
    timestamp += (parameter.value.nanosecondDelta != null ? parameter.value.nanosecondDelta : 0) * Math.pow(10, parameter.scale);
    timestamp = Math.round(timestamp);

    switch (parameter.scale) {
      case 0:
      case 1:
      case 2:
        buffer.writeUInt24LE(timestamp);
        break;

      case 3:
      case 4:
        buffer.writeUInt32LE(timestamp);
        break;

      case 5:
      case 6:
      case 7:
        buffer.writeUInt40LE(timestamp);
    }

    yield buffer.data;
  },

  validate: function (value) {
    if (value == null) {
      return null;
    }

    if (!(value instanceof Date)) {
      value = new Date(Date.parse(value));
    }

    if (isNaN(value)) {
      throw new TypeError('Invalid time.');
    }

    return value;
  }
};
var _default = Time;
exports.default = _default;
module.exports = Time;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJOVUxMX0xFTkdUSCIsIkJ1ZmZlciIsImZyb20iLCJUaW1lIiwiaWQiLCJ0eXBlIiwibmFtZSIsImRlY2xhcmF0aW9uIiwicGFyYW1ldGVyIiwicmVzb2x2ZVNjYWxlIiwic2NhbGUiLCJ2YWx1ZSIsImdlbmVyYXRlVHlwZUluZm8iLCJnZW5lcmF0ZVBhcmFtZXRlckxlbmd0aCIsIm9wdGlvbnMiLCJFcnJvciIsImdlbmVyYXRlUGFyYW1ldGVyRGF0YSIsImJ1ZmZlciIsIldyaXRhYmxlVHJhY2tpbmdCdWZmZXIiLCJ0aW1lIiwidGltZXN0YW1wIiwidXNlVVRDIiwiZ2V0VVRDSG91cnMiLCJnZXRVVENNaW51dGVzIiwiZ2V0VVRDU2Vjb25kcyIsImdldFVUQ01pbGxpc2Vjb25kcyIsImdldEhvdXJzIiwiZ2V0TWludXRlcyIsImdldFNlY29uZHMiLCJnZXRNaWxsaXNlY29uZHMiLCJNYXRoIiwicG93IiwibmFub3NlY29uZERlbHRhIiwicm91bmQiLCJ3cml0ZVVJbnQyNExFIiwid3JpdGVVSW50MzJMRSIsIndyaXRlVUludDQwTEUiLCJkYXRhIiwidmFsaWRhdGUiLCJEYXRlIiwicGFyc2UiLCJpc05hTiIsIlR5cGVFcnJvciIsIm1vZHVsZSIsImV4cG9ydHMiXSwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS10eXBlcy90aW1lLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vZGF0YS10eXBlJztcbmltcG9ydCBXcml0YWJsZVRyYWNraW5nQnVmZmVyIGZyb20gJy4uL3RyYWNraW5nLWJ1ZmZlci93cml0YWJsZS10cmFja2luZy1idWZmZXInO1xuXG5jb25zdCBOVUxMX0xFTkdUSCA9IEJ1ZmZlci5mcm9tKFsweDAwXSk7XG5cbmNvbnN0IFRpbWU6IERhdGFUeXBlID0ge1xuICBpZDogMHgyOSxcbiAgdHlwZTogJ1RJTUVOJyxcbiAgbmFtZTogJ1RpbWUnLFxuXG4gIGRlY2xhcmF0aW9uOiBmdW5jdGlvbihwYXJhbWV0ZXIpIHtcbiAgICByZXR1cm4gJ3RpbWUoJyArICh0aGlzLnJlc29sdmVTY2FsZSEocGFyYW1ldGVyKSkgKyAnKSc7XG4gIH0sXG5cbiAgcmVzb2x2ZVNjYWxlOiBmdW5jdGlvbihwYXJhbWV0ZXIpIHtcbiAgICBpZiAocGFyYW1ldGVyLnNjYWxlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBwYXJhbWV0ZXIuc2NhbGU7XG4gICAgfSBlbHNlIGlmIChwYXJhbWV0ZXIudmFsdWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gNztcbiAgICB9XG4gIH0sXG5cbiAgZ2VuZXJhdGVUeXBlSW5mbyhwYXJhbWV0ZXIpIHtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oW3RoaXMuaWQsIHBhcmFtZXRlci5zY2FsZSFdKTtcbiAgfSxcblxuICBnZW5lcmF0ZVBhcmFtZXRlckxlbmd0aChwYXJhbWV0ZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAocGFyYW1ldGVyLnZhbHVlID09IG51bGwpIHtcbiAgICAgIHJldHVybiBOVUxMX0xFTkdUSDtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHBhcmFtZXRlci5zY2FsZSkge1xuICAgICAgY2FzZSAwOlxuICAgICAgY2FzZSAxOlxuICAgICAgY2FzZSAyOlxuICAgICAgICByZXR1cm4gQnVmZmVyLmZyb20oWzB4MDNdKTtcbiAgICAgIGNhc2UgMzpcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgcmV0dXJuIEJ1ZmZlci5mcm9tKFsweDA0XSk7XG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6XG4gICAgICBjYXNlIDc6XG4gICAgICAgIHJldHVybiBCdWZmZXIuZnJvbShbMHgwNV0pO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIHNjYWxlJyk7XG4gICAgfVxuICB9LFxuXG4gICogZ2VuZXJhdGVQYXJhbWV0ZXJEYXRhKHBhcmFtZXRlciwgb3B0aW9ucykge1xuICAgIGlmIChwYXJhbWV0ZXIudmFsdWUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBXcml0YWJsZVRyYWNraW5nQnVmZmVyKDE2KTtcbiAgICBjb25zdCB0aW1lID0gcGFyYW1ldGVyLnZhbHVlO1xuXG4gICAgbGV0IHRpbWVzdGFtcDtcbiAgICBpZiAob3B0aW9ucy51c2VVVEMpIHtcbiAgICAgIHRpbWVzdGFtcCA9ICgodGltZS5nZXRVVENIb3VycygpICogNjAgKyB0aW1lLmdldFVUQ01pbnV0ZXMoKSkgKiA2MCArIHRpbWUuZ2V0VVRDU2Vjb25kcygpKSAqIDEwMDAgKyB0aW1lLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aW1lc3RhbXAgPSAoKHRpbWUuZ2V0SG91cnMoKSAqIDYwICsgdGltZS5nZXRNaW51dGVzKCkpICogNjAgKyB0aW1lLmdldFNlY29uZHMoKSkgKiAxMDAwICsgdGltZS5nZXRNaWxsaXNlY29uZHMoKTtcbiAgICB9XG5cbiAgICB0aW1lc3RhbXAgPSB0aW1lc3RhbXAgKiBNYXRoLnBvdygxMCwgcGFyYW1ldGVyLnNjYWxlISAtIDMpO1xuICAgIHRpbWVzdGFtcCArPSAocGFyYW1ldGVyLnZhbHVlLm5hbm9zZWNvbmREZWx0YSAhPSBudWxsID8gcGFyYW1ldGVyLnZhbHVlLm5hbm9zZWNvbmREZWx0YSA6IDApICogTWF0aC5wb3coMTAsIHBhcmFtZXRlci5zY2FsZSEpO1xuICAgIHRpbWVzdGFtcCA9IE1hdGgucm91bmQodGltZXN0YW1wKTtcblxuICAgIHN3aXRjaCAocGFyYW1ldGVyLnNjYWxlKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICBjYXNlIDE6XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGJ1ZmZlci53cml0ZVVJbnQyNExFKHRpbWVzdGFtcCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgY2FzZSA0OlxuICAgICAgICBidWZmZXIud3JpdGVVSW50MzJMRSh0aW1lc3RhbXApO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNTpcbiAgICAgIGNhc2UgNjpcbiAgICAgIGNhc2UgNzpcbiAgICAgICAgYnVmZmVyLndyaXRlVUludDQwTEUodGltZXN0YW1wKTtcbiAgICB9XG5cbiAgICB5aWVsZCBidWZmZXIuZGF0YTtcbiAgfSxcblxuICB2YWxpZGF0ZTogZnVuY3Rpb24odmFsdWUpOiBudWxsIHwgbnVtYmVyIHwgRGF0ZSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICAgIHZhbHVlID0gbmV3IERhdGUoRGF0ZS5wYXJzZSh2YWx1ZSkpO1xuICAgIH1cblxuICAgIGlmIChpc05hTih2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgdGltZS4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn07XG5cblxuZXhwb3J0IGRlZmF1bHQgVGltZTtcbm1vZHVsZS5leHBvcnRzID0gVGltZTtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUNBOzs7O0FBRUEsTUFBTUEsV0FBVyxHQUFHQyxNQUFNLENBQUNDLElBQVAsQ0FBWSxDQUFDLElBQUQsQ0FBWixDQUFwQjtBQUVBLE1BQU1DLElBQWMsR0FBRztFQUNyQkMsRUFBRSxFQUFFLElBRGlCO0VBRXJCQyxJQUFJLEVBQUUsT0FGZTtFQUdyQkMsSUFBSSxFQUFFLE1BSGU7RUFLckJDLFdBQVcsRUFBRSxVQUFTQyxTQUFULEVBQW9CO0lBQy9CLE9BQU8sVUFBVyxLQUFLQyxZQUFMLENBQW1CRCxTQUFuQixDQUFYLEdBQTRDLEdBQW5EO0VBQ0QsQ0FQb0I7RUFTckJDLFlBQVksRUFBRSxVQUFTRCxTQUFULEVBQW9CO0lBQ2hDLElBQUlBLFNBQVMsQ0FBQ0UsS0FBVixJQUFtQixJQUF2QixFQUE2QjtNQUMzQixPQUFPRixTQUFTLENB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