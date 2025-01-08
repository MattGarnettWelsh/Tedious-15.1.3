"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _core = require("@js-joda/core");

var _writableTrackingBuffer = _interopRequireDefault(require("../tracking-buffer/writable-tracking-buffer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const EPOCH_DATE = _core.LocalDate.ofYearDay(1, 1);

const NULL_LENGTH = Buffer.from([0x00]);
const DateTime2 = {
  id: 0x2A,
  type: 'DATETIME2N',
  name: 'DateTime2',
  declaration: function (parameter) {
    return 'datetime2(' + this.resolveScale(parameter) + ')';
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

  generateTypeInfo(parameter, _options) {
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
        return Buffer.from([0x06]);

      case 3:
      case 4:
        return Buffer.from([0x07]);

      case 5:
      case 6:
      case 7:
        return Buffer.from([0x08]);

      default:
        throw new Error('invalid scale');
    }
  },

  *generateParameterData(parameter, options) {
    if (parameter.value == null) {
      return;
    }

    const value = parameter.value;
    let scale = parameter.scale;
    const buffer = new _writableTrackingBuffer.default(16);
    scale = scale;
    let timestamp;

    if (options.useUTC) {
      timestamp = ((value.getUTCHours() * 60 + value.getUTCMinutes()) * 60 + value.getUTCSeconds()) * 1000 + value.getUTCMilliseconds();
    } else {
      timestamp = ((value.getHours() * 60 + value.getMinutes()) * 60 + value.getSeconds()) * 1000 + value.getMilliseconds();
    }

    timestamp = timestamp * Math.pow(10, scale - 3);
    timestamp += (value.nanosecondDelta != null ? value.nanosecondDelta : 0) * Math.pow(10, scale);
    timestamp = Math.round(timestamp);

    switch (scale) {
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

    let date;

    if (options.useUTC) {
      date = _core.LocalDate.of(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
    } else {
      date = _core.LocalDate.of(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    const days = EPOCH_DATE.until(date, _core.ChronoUnit.DAYS);
    buffer.writeUInt24LE(days);
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
      throw new TypeError('Invalid date.');
    }

    return value;
  }
};
var _default = DateTime2;
exports.default = _default;
module.exports = DateTime2;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJFUE9DSF9EQVRFIiwiTG9jYWxEYXRlIiwib2ZZZWFyRGF5IiwiTlVMTF9MRU5HVEgiLCJCdWZmZXIiLCJmcm9tIiwiRGF0ZVRpbWUyIiwiaWQiLCJ0eXBlIiwibmFtZSIsImRlY2xhcmF0aW9uIiwicGFyYW1ldGVyIiwicmVzb2x2ZVNjYWxlIiwic2NhbGUiLCJ2YWx1ZSIsImdlbmVyYXRlVHlwZUluZm8iLCJfb3B0aW9ucyIsImdlbmVyYXRlUGFyYW1ldGVyTGVuZ3RoIiwib3B0aW9ucyIsIkVycm9yIiwiZ2VuZXJhdGVQYXJhbWV0ZXJEYXRhIiwiYnVmZmVyIiwiV3JpdGFibGVUcmFja2luZ0J1ZmZlciIsInRpbWVzdGFtcCIsInVzZVVUQyIsImdldFVUQ0hvdXJzIiwiZ2V0VVRDTWludXRlcyIsImdldFVUQ1NlY29uZHMiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJnZXRIb3VycyIsImdldE1pbnV0ZXMiLCJnZXRTZWNvbmRzIiwiZ2V0TWlsbGlzZWNvbmRzIiwiTWF0aCIsInBvdyIsIm5hbm9zZWNvbmREZWx0YSIsInJvdW5kIiwid3JpdGVVSW50MjRMRSIsIndyaXRlVUludDMyTEUiLCJ3cml0ZVVJbnQ0MExFIiwiZGF0ZSIsIm9mIiwiZ2V0VVRDRnVsbFllYXIiLCJnZXRVVENNb250aCIsImdldFVUQ0RhdGUiLCJnZXRGdWxsWWVhciIsImdldE1vbnRoIiwiZ2V0RGF0ZSIsImRheXMiLCJ1bnRpbCIsIkNocm9ub1VuaXQiLCJEQVlTIiwiZGF0YSIsInZhbGlkYXRlIiwiRGF0ZSIsInBhcnNlIiwiaXNOYU4iLCJUeXBlRXJyb3IiLCJtb2R1bGUiLCJleHBvcnRzIl0sInNvdXJjZXMiOlsiLi4vLi4vc3JjL2RhdGEtdHlwZXMvZGF0ZXRpbWUyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vZGF0YS10eXBlJztcbmltcG9ydCB7IENocm9ub1VuaXQsIExvY2FsRGF0ZSB9IGZyb20gJ0Bqcy1qb2RhL2NvcmUnO1xuaW1wb3J0IFdyaXRhYmxlVHJhY2tpbmdCdWZmZXIgZnJvbSAnLi4vdHJhY2tpbmctYnVmZmVyL3dyaXRhYmxlLXRyYWNraW5nLWJ1ZmZlcic7XG5cbmNvbnN0IEVQT0NIX0RBVEUgPSBMb2NhbERhdGUub2ZZZWFyRGF5KDEsIDEpO1xuY29uc3QgTlVMTF9MRU5HVEggPSBCdWZmZXIuZnJvbShbMHgwMF0pO1xuXG5jb25zdCBEYXRlVGltZTI6IERhdGFUeXBlICYgeyByZXNvbHZlU2NhbGU6IE5vbk51bGxhYmxlPERhdGFUeXBlWydyZXNvbHZlU2NhbGUnXT4gfSA9IHtcbiAgaWQ6IDB4MkEsXG4gIHR5cGU6ICdEQVRFVElNRTJOJyxcbiAgbmFtZTogJ0RhdGVUaW1lMicsXG5cbiAgZGVjbGFyYXRpb246IGZ1bmN0aW9uKHBhcmFtZXRlcikge1xuICAgIHJldHVybiAnZGF0ZXRpbWUyKCcgKyAodGhpcy5yZXNvbHZlU2NhbGUocGFyYW1ldGVyKSkgKyAnKSc7XG4gIH0sXG5cbiAgcmVzb2x2ZVNjYWxlOiBmdW5jdGlvbihwYXJhbWV0ZXIpIHtcbiAgICBpZiAocGFyYW1ldGVyLnNjYWxlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBwYXJhbWV0ZXIuc2NhbGU7XG4gICAgfSBlbHNlIGlmIChwYXJhbWV0ZXIudmFsdWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gNztcbiAgICB9XG4gIH0sXG5cbiAgZ2VuZXJhdGVUeXBlSW5mbyhwYXJhbWV0ZXIsIF9vcHRpb25zKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKFt0aGlzLmlkLCBwYXJhbWV0ZXIuc2NhbGUhXSk7XG4gIH0sXG5cbiAgZ2VuZXJhdGVQYXJhbWV0ZXJMZW5ndGgocGFyYW1ldGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHBhcmFtZXRlci52YWx1ZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gTlVMTF9MRU5HVEg7XG4gICAgfVxuXG4gICAgc3dpdGNoIChwYXJhbWV0ZXIuc2NhbGUhKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICBjYXNlIDE6XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHJldHVybiBCdWZmZXIuZnJvbShbMHgwNl0pO1xuXG4gICAgICBjYXNlIDM6XG4gICAgICBjYXNlIDQ6XG4gICAgICAgIHJldHVybiBCdWZmZXIuZnJvbShbMHgwN10pO1xuXG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6XG4gICAgICBjYXNlIDc6XG4gICAgICAgIHJldHVybiBCdWZmZXIuZnJvbShbMHgwOF0pO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgc2NhbGUnKTtcbiAgICB9XG4gIH0sXG5cbiAgKmdlbmVyYXRlUGFyYW1ldGVyRGF0YShwYXJhbWV0ZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAocGFyYW1ldGVyLnZhbHVlID09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9IHBhcmFtZXRlci52YWx1ZTtcbiAgICBsZXQgc2NhbGUgPSBwYXJhbWV0ZXIuc2NhbGU7XG5cbiAgICBjb25zdCBidWZmZXIgPSBuZXcgV3JpdGFibGVUcmFja2luZ0J1ZmZlcigxNik7XG4gICAgc2NhbGUgPSBzY2FsZSE7XG5cbiAgICBsZXQgdGltZXN0YW1wO1xuICAgIGlmIChvcHRpb25zLnVzZVVUQykge1xuICAgICAgdGltZXN0YW1wID0gKCh2YWx1ZS5nZXRVVENIb3VycygpICogNjAgKyB2YWx1ZS5nZXRVVENNaW51dGVzKCkpICogNjAgKyB2YWx1ZS5nZXRVVENTZWNvbmRzKCkpICogMTAwMCArIHZhbHVlLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aW1lc3RhbXAgPSAoKHZhbHVlLmdldEhvdXJzKCkgKiA2MCArIHZhbHVlLmdldE1pbnV0ZXMoKSkgKiA2MCArIHZhbHVlLmdldFNlY29uZHMoKSkgKiAxMDAwICsgdmFsdWUuZ2V0TWlsbGlzZWNvbmRzKCk7XG4gICAgfVxuICAgIHRpbWVzdGFtcCA9IHRpbWVzdGFtcCAqIE1hdGgucG93KDEwLCBzY2FsZSAtIDMpO1xuICAgIHRpbWVzdGFtcCArPSAodmFsdWUubmFub3NlY29uZERlbHRhICE9IG51bGwgPyB2YWx1ZS5uYW5vc2Vjb25kRGVsdGEgOiAwKSAqIE1hdGgucG93KDEwLCBzY2FsZSk7XG4gICAgdGltZXN0YW1wID0gTWF0aC5yb3VuZCh0aW1lc3RhbXApO1xuXG4gICAgc3dpdGNoIChzY2FsZSkge1xuICAgICAgY2FzZSAwOlxuICAgICAgY2FzZSAxOlxuICAgICAgY2FzZSAyOlxuICAgICAgICBidWZmZXIud3JpdGVVSW50MjRMRSh0aW1lc3RhbXApO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgYnVmZmVyLndyaXRlVUludDMyTEUodGltZXN0YW1wKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6XG4gICAgICBjYXNlIDc6XG4gICAgICAgIGJ1ZmZlci53cml0ZVVJbnQ0MExFKHRpbWVzdGFtcCk7XG4gICAgfVxuXG4gICAgbGV0IGRhdGU7XG4gICAgaWYgKG9wdGlvbnMudXNlVVRDKSB7XG4gICAgICBkYXRlID0gTG9jYWxEYXRlLm9mKHZhbHVlLmdldFVUQ0Z1bGxZZWFyKCksIHZhbHVlLmdldFVUQ01vbnRoKCkgKyAxLCB2YWx1ZS5nZXRVVENEYXRlKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkYXRlID0gTG9jYWxEYXRlLm9mKHZhbHVlLmdldEZ1bGxZZWFyKCksIHZhbHVlLmdldE1vbnRoKCkgKyAxLCB2YWx1ZS5nZXREYXRlKCkpO1xuICAgIH1cblxuICAgIGNvbnN0IGRheXMgPSBFUE9DSF9EQVRFLnVudGlsKGRhdGUsIENocm9ub1VuaXQuREFZUyk7XG4gICAgYnVmZmVyLndyaXRlVUludDI0TEUoZGF5cyk7XG4gICAgeWllbGQgYnVmZmVyLmRhdGE7XG4gIH0sXG5cbiAgdmFsaWRhdGU6IGZ1bmN0aW9uKHZhbHVlKTogbnVsbCB8IG51bWJlciB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICAgIHZhbHVlID0gbmV3IERhdGUoRGF0ZS5wYXJzZSh2YWx1ZSkpO1xuICAgIH1cblxuICAgIGlmIChpc05hTih2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgZGF0ZS4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IERhdGVUaW1lMjtcbm1vZHVsZS5leHBvcnRzID0gRGF0ZVRpbWUyO1xuIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQ0E7O0FBQ0E7Ozs7QUFFQSxNQUFNQSxVQUFVLEdBQUdDLGdCQUFVQyxTQUFWLENBQW9CLENBQXBCLEVBQXVCLENBQXZCLENBQW5COztBQUNBLE1BQU1DLFdBQVcsR0FBR0MsTUFBTSxDQUFDQyxJQUFQLENBQVksQ0FBQyxJQUFELENBQVosQ0FBcEI7QUFFQSxNQUFNQyxTQUE2RSxHQUFHO0VBQ3BGQyxFQUFFLEVBQUUsSUFEZ0Y7RUFFcEZDLElBQUksRUFBRSxZQUY4RTtFQUdwRkMsSUFBSSxFQUFFLFdBSDhFO0VBS3BGQyxXQUFXLEVBQUUsVUFBU0MsU0FBVCxFQUFvQjtJQUMvQixPQUFPLGVBQWdCLEtBQUtDLFlBQUwsQ0FBa0JELFNBQWxCLENBQWhCLEdBQWdELEdBQXZEO0VBQ0QsQ0FQbUY7RUFTcEZDLFlBQVksRUFBRSxVQUFTRCxTQUFULEVBQW9CO0lBQ2hDLElBQUlBLFNBQVMsQ0FBQ0UsS0FBVixJQUFtQixJQUF2QixFQUE2QjtNQUMzQixPQUFPRixTQUFTLENBQUNFLEtBQWpCO0lBQ0QsQ0FGRCxNQUVPLElBQUlGLFNBQVMsQ0FBQ0csS0FBVixLQUFvQixJQUF4QixFQUE4QjtNQUNuQyxPQUFPLENBQVA7SUFDRCxDQUZNLE1BRUE7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