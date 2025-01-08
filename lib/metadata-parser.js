"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
exports.readCollation = readCollation;

var _collation = require("./collation");

var _dataType = require("./data-type");

var _sprintfJs = require("sprintf-js");

function readCollation(parser, callback) {
  // s2.2.5.1.2
  parser.readBuffer(5, collationData => {
    callback(_collation.Collation.fromBuffer(collationData));
  });
}

function readSchema(parser, callback) {
  // s2.2.5.5.3
  parser.readUInt8(schemaPresent => {
    if (schemaPresent === 0x01) {
      parser.readBVarChar(dbname => {
        parser.readBVarChar(owningSchema => {
          parser.readUsVarChar(xmlSchemaCollection => {
            callback({
              dbname: dbname,
              owningSchema: owningSchema,
              xmlSchemaCollection: xmlSchemaCollection
            });
          });
        });
      });
    } else {
      callback(undefined);
    }
  });
}

function readUDTInfo(parser, callback) {
  parser.readUInt16LE(maxByteSize => {
    parser.readBVarChar(dbname => {
      parser.readBVarChar(owningSchema => {
        parser.readBVarChar(typeName => {
          parser.readUsVarChar(assemblyName => {
            callback({
              maxByteSize: maxByteSize,
              dbname: dbname,
              owningSchema: owningSchema,
              typeName: typeName,
              assemblyName: assemblyName
            });
          });
        });
      });
    });
  });
}

function metadataParse(parser, options, callback) {
  (options.tdsVersion < '7_2' ? parser.readUInt16LE : parser.readUInt32LE).call(parser, userType => {
    parser.readUInt16LE(flags => {
      parser.readUInt8(typeNumber => {
        const type = _dataType.TYPE[typeNumber];

        if (!type) {
          throw new Error((0, _sprintfJs.sprintf)('Unrecognised data type 0x%02X', typeNumber));
        }

        switch (type.name) {
          case 'Null':
          case 'TinyInt':
          case 'SmallInt':
          case 'Int':
          case 'BigInt':
          case 'Real':
          case 'Float':
          case 'SmallMoney':
          case 'Money':
          case 'Bit':
          case 'SmallDateTime':
          case 'DateTime':
          case 'Date':
            return callback({
              userType: userType,
              flags: flags,
              type: type,
              collation: undefined,
              precision: undefined,
              scale: undefined,
              dataLength: undefined,
              schema: undefined,
              udtInfo: undefined
            });

          case 'IntN':
          case 'FloatN':
          case 'MoneyN':
          case 'BitN':
          case 'UniqueIdentifier':
          case 'DateTimeN':
            return parser.readUInt8(dataLength => {
              callback({
                userType: userType,
                flags: flags,
                type: type,
                collation: undefined,
                precision: undefined,
                scale: undefined,
                dataLength: dataLength,
                schema: undefined,
                udtInfo: undefined
              });
            });

          case 'Variant':
            return parser.readUInt32LE(dataLength => {
              callback({
                userType: userType,
                flags: flags,
                type: type,
                collation: undefined,
                precision: undefined,
                scale: undefined,
                dataLength: dataLength,
                schema: undefined,
                udtInfo: undefined
              });
            });

          case 'VarChar':
          case 'Char':
          case 'NVarChar':
          case 'NChar':
            return parser.readUInt16LE(dataLength => {
              readCollation(parser, collation => {
                callback({
                  userType: userType,
                  flags: flags,
                  type: type,
                  collation: collation,
                  precision: undefined,
                  scale: undefined,
                  dataLength: dataLength,
                  schema: undefined,
                  udtInfo: undefined
                });
              });
            });

          case 'Text':
          case 'NText':
            return parser.readUInt32LE(dataLength => {
              readCollation(parser, collation => {
                callback({
                  userType: userType,
                  flags: flags,
                  type: type,
                  collation: collation,
                  precision: undefined,
                  scale: undefined,
                  dataLength: dataLength,
                  schema: undefined,
                  udtInfo: undefined
                });
              });
            });

          case 'VarBinary':
          case 'Binary':
            return parser.readUInt16LE(dataLength => {
              callback({
                userType: userType,
                flags: flags,
                type: type,
                collation: undefined,
                precision: undefined,
                scale: undefined,
                dataLength: dataLength,
                schema: undefined,
                udtInfo: undefined
              });
            });

          case 'Image':
            return parser.readUInt32LE(dataLength => {
              callback({
                userType: userType,
                flags: flags,
                type: type,
                collation: undefined,
                precision: undefined,
                scale: undefined,
                dataLength: dataLength,
                schema: undefined,
                udtInfo: undefined
              });
            });

          case 'Xml':
            return readSchema(parser, schema => {
              callback({
                userType: userType,
                flags: flags,
                type: type,
                collation: undefined,
                precision: undefined,
                scale: undefined,
                dataLength: undefined,
                schema: schema,
                udtInfo: undefined
              });
            });

          case 'Time':
          case 'DateTime2':
          case 'DateTimeOffset':
            return parser.readUInt8(scale => {
              callback({
                userType: userType,
                flags: flags,
                type: type,
                collation: undefined,
                precision: undefined,
                scale: scale,
                dataLength: undefined,
                schema: undefined,
                udtInfo: undefined
              });
            });

          case 'NumericN':
          case 'DecimalN':
            return parser.readUInt8(dataLength => {
              parser.readUInt8(precision => {
                parser.readUInt8(scale => {
                  callback({
                    userType: userType,
                    flags: flags,
                    type: type,
                    collation: undefined,
                    precision: precision,
                    scale: scale,
                    dataLength: dataLength,
                    schema: undefined,
                    udtInfo: undefined
                  });
                });
              });
            });

          case 'UDT':
            return readUDTInfo(parser, udtInfo => {
              callback({
                userType: userType,
                flags: flags,
                type: type,
                collation: undefined,
                precision: undefined,
                scale: undefined,
                dataLength: undefined,
                schema: undefined,
                udtInfo: udtInfo
              });
            });

          default:
            throw new Error((0, _sprintfJs.sprintf)('Unrecognised type %s', type.name));
        }
      });
    });
  });
}

var _default = metadataParse;
exports.default = _default;
module.exports = metadataParse;
module.exports.readCollation = readCollation;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJyZWFkQ29sbGF0aW9uIiwicGFyc2VyIiwiY2FsbGJhY2siLCJyZWFkQnVmZmVyIiwiY29sbGF0aW9uRGF0YSIsIkNvbGxhdGlvbiIsImZyb21CdWZmZXIiLCJyZWFkU2NoZW1hIiwicmVhZFVJbnQ4Iiwic2NoZW1hUHJlc2VudCIsInJlYWRCVmFyQ2hhciIsImRibmFtZSIsIm93bmluZ1NjaGVtYSIsInJlYWRVc1ZhckNoYXIiLCJ4bWxTY2hlbWFDb2xsZWN0aW9uIiwidW5kZWZpbmVkIiwicmVhZFVEVEluZm8iLCJyZWFkVUludDE2TEUiLCJtYXhCeXRlU2l6ZSIsInR5cGVOYW1lIiwiYXNzZW1ibHlOYW1lIiwibWV0YWRhdGFQYXJzZSIsIm9wdGlvbnMiLCJ0ZHNWZXJzaW9uIiwicmVhZFVJbnQzMkxFIiwiY2FsbCIsInVzZXJUeXBlIiwiZmxhZ3MiLCJ0eXBlTnVtYmVyIiwidHlwZSIsIlRZUEUiLCJFcnJvciIsIm5hbWUiLCJjb2xsYXRpb24iLCJwcmVjaXNpb24iLCJzY2FsZSIsImRhdGFMZW5ndGgiLCJzY2hlbWEiLCJ1ZHRJbmZvIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJzb3VyY2VzIjpbIi4uL3NyYy9tZXRhZGF0YS1wYXJzZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29sbGF0aW9uIH0gZnJvbSAnLi9jb2xsYXRpb24nO1xuaW1wb3J0IFBhcnNlciwgeyBQYXJzZXJPcHRpb25zIH0gZnJvbSAnLi90b2tlbi9zdHJlYW0tcGFyc2VyJztcbmltcG9ydCB7IFRZUEUsIERhdGFUeXBlIH0gZnJvbSAnLi9kYXRhLXR5cGUnO1xuaW1wb3J0IHsgQ3J5cHRvTWV0YWRhdGEgfSBmcm9tICcuL2Fsd2F5cy1lbmNyeXB0ZWQvdHlwZXMnO1xuXG5pbXBvcnQgeyBzcHJpbnRmIH0gZnJvbSAnc3ByaW50Zi1qcyc7XG5cbmludGVyZmFjZSBYbWxTY2hlbWEge1xuICBkYm5hbWU6IHN0cmluZztcbiAgb3duaW5nU2NoZW1hOiBzdHJpbmc7XG4gIHhtbFNjaGVtYUNvbGxlY3Rpb246IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFVkdEluZm8ge1xuICBtYXhCeXRlU2l6ZTogbnVtYmVyO1xuICBkYm5hbWU6IHN0cmluZztcbiAgb3duaW5nU2NoZW1hOiBzdHJpbmc7XG4gIHR5cGVOYW1lOiBzdHJpbmc7XG4gIGFzc2VtYmx5TmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBCYXNlTWV0YWRhdGEgPSB7XG4gIHVzZXJUeXBlOiBudW1iZXI7XG5cbiAgZmxhZ3M6IG51bWJlcjtcbiAgLyoqXG4gICAqIFRoZSBjb2x1bW4ncyB0eXBlLCBzdWNoIGFzIFZhckNoYXIsIEludCBvciBCaW5hcnkuXG4gICAqL1xuICB0eXBlOiBEYXRhVHlwZTtcblxuICBjb2xsYXRpb246IENvbGxhdGlvbiB8IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIFRoZSBwcmVjaXNpb24uIE9ubHkgYXBwbGljYWJsZSB0byBudW1lcmljIGFuZCBkZWNpbWFsLlxuICAgKi9cbiAgcHJlY2lzaW9uOiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFRoZSBzY2FsZS4gT25seSBhcHBsaWNhYmxlIHRvIG51bWVyaWMsIGRlY2ltYWwsIHRpbWUsIGRhdGV0aW1lMiBhbmQgZGF0ZXRpbWVvZmZzZXQuXG4gICAqL1xuICBzY2FsZTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBUaGUgbGVuZ3RoLCBmb3IgY2hhciwgdmFyY2hhciwgbnZhcmNoYXIgYW5kIHZhcmJpbmFyeS5cbiAgICovXG4gIGRhdGFMZW5ndGg6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICBzY2hlbWE6IFhtbFNjaGVtYSB8IHVuZGVmaW5lZDtcblxuICB1ZHRJbmZvOiBVZHRJbmZvIHwgdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgdHlwZSBNZXRhZGF0YSA9IHtcbiAgY3J5cHRvTWV0YWRhdGE/OiBDcnlwdG9NZXRhZGF0YTtcbn0gJiBCYXNlTWV0YWRhdGE7XG5cblxuZnVuY3Rpb24gcmVhZENvbGxhdGlvbihwYXJzZXI6IFBhcnNlciwgY2FsbGJhY2s6IChjb2xsYXRpb246IENvbGxhdGlvbikgPT4gdm9pZCkge1xuICAvLyBzMi4yLjUuMS4yXG4gIHBhcnNlci5yZWFkQnVmZmVyKDUsIChjb2xsYXRpb25EYXRhKSA9PiB7XG4gICAgY2FsbGJhY2soQ29sbGF0aW9uLmZyb21CdWZmZXIoY29sbGF0aW9uRGF0YSkpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVhZFNjaGVtYShwYXJzZXI6IFBhcnNlciwgY2FsbGJhY2s6IChzY2hlbWE6IFhtbFNjaGVtYSB8IHVuZGVmaW5lZCkgPT4gdm9pZCkge1xuICAvLyBzMi4yLjUuNS4zXG4gIHBhcnNlci5yZWFkVUludDgoKHNjaGVtYVByZXNlbnQpID0+IHtcbiAgICBpZiAoc2NoZW1hUHJlc2VudCA9PT0gMHgwMSkge1xuICAgICAgcGFyc2VyLnJlYWRCVmFyQ2hhcigoZGJuYW1lKSA9PiB7XG4gICAgICAgIHBhcnNlci5yZWFkQlZhckNoYXIoKG93bmluZ1NjaGVtYSkgPT4ge1xuICAgICAgICAgIHBhcnNlci5yZWFkVXNWYXJDaGFyKCh4bWxTY2hlbWFDb2xsZWN0aW9uKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgIGRibmFtZTogZGJuYW1lLFxuICAgICAgICAgICAgICBvd25pbmdTY2hlbWE6IG93bmluZ1NjaGVtYSxcbiAgICAgICAgICAgICAgeG1sU2NoZW1hQ29sbGVjdGlvbjogeG1sU2NoZW1hQ29sbGVjdGlvblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVhZFVEVEluZm8ocGFyc2VyOiBQYXJzZXIsIGNhbGxiYWNrOiAodWR0SW5mbzogVWR0SW5mbyB8IHVuZGVmaW5lZCkgPT4gdm9pZCkge1xuICBwYXJzZXIucmVhZFVJbnQxNkxFKChtYXhCeXRlU2l6ZSkgPT4ge1xuICAgIHBhcnNlci5yZWFkQlZhckNoYXIoKGRibmFtZSkgPT4ge1xuICAgICAgcGFyc2VyLnJlYWRCVmFyQ2hhcigob3duaW5nU2NoZW1hKSA9PiB7XG4gICAgICAgIHBhcnNlci5yZWFkQlZhckNoYXIoKHR5cGVOYW1lKSA9PiB7XG4gICAgICAgICAgcGFyc2VyLnJlYWRVc1ZhckNoYXIoKGFzc2VtYmx5TmFtZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICBtYXhCeXRlU2l6ZTogbWF4Qnl0ZVNpemUsXG4gICAgICAgICAgICAgIGRibmFtZTogZGJuYW1lLFxuICAgICAgICAgICAgICBvd25pbmdTY2hlbWE6IG93bmluZ1NjaGVtYSxcbiAgICAgICAgICAgICAgdHlwZU5hbWU6IHR5cGVOYW1lLFxuICAgICAgICAgICAgICBhc3NlbWJseU5hbWU6IGFzc2VtYmx5TmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtZXRhZGF0YVBhcnNlKHBhcnNlcjogUGFyc2VyLCBvcHRpb25zOiBQYXJzZXJPcHRpb25zLCBjYWxsYmFjazogKG1ldGFkYXRhOiBNZXRhZGF0YSkgPT4gdm9pZCkge1xuICAob3B0aW9ucy50ZHNWZXJzaW9uIDwgJzdfMicgPyBwYXJzZXIucmVhZFVJbnQxNkxFIDogcGFyc2VyLnJlYWRVSW50MzJMRSkuY2FsbChwYXJzZXIsICh1c2VyVHlwZSkgPT4ge1xuICAgIHBhcnNlci5yZWFkVUludDE2TEUoKGZsYWdzKSA9PiB7XG4gICAgICBwYXJzZXIucmVhZFVJbnQ4KCh0eXBlTnVtYmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IHR5cGU6IERhdGFUeXBlID0gVFlQRVt0eXBlTnVtYmVyXTtcblxuICAgICAgICBpZiAoIXR5cGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3ByaW50ZignVW5yZWNvZ25pc2VkIGRhdGEgdHlwZSAweCUwMlgnLCB0eXBlTnVtYmVyKSk7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKHR5cGUubmFtZSkge1xuICAgICAgICAgIGNhc2UgJ051bGwnOlxuICAgICAgICAgIGNhc2UgJ1RpbnlJbnQnOlxuICAgICAgICAgIGNhc2UgJ1NtYWxsSW50JzpcbiAgICAgICAgICBjYXNlICdJbnQnOlxuICAgICAgICAgIGNhc2UgJ0JpZ0ludCc6XG4gICAgICAgICAgY2FzZSAnUmVhbCc6XG4gICAgICAgICAgY2FzZSAnRmxvYXQnOlxuICAgICAgICAgIGNhc2UgJ1NtYWxsTW9uZXknOlxuICAgICAgICAgIGNhc2UgJ01vbmV5JzpcbiAgICAgICAgICBjYXNlICdCaXQnOlxuICAgICAgICAgIGNhc2UgJ1NtYWxsRGF0ZVRpbWUnOlxuICAgICAgICAgIGNhc2UgJ0RhdGVUaW1lJzpcbiAgICAgICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayh7XG4gICAgICAgICAgICAgIHVzZXJUeXBlOiB1c2VyVHlwZSxcbiAgICAgICAgICAgICAgZmxhZ3M6IGZsYWdzLFxuICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgICBjb2xsYXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIHNjYWxlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIGRhdGFMZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgc2NoZW1hOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIHVkdEluZm86IHVuZGVmaW5lZFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjYXNlICdJbnROJzpcbiAgICAgICAgICBjYXNlICdGbG9hdE4nOlxuICAgICAgICAgIGNhc2UgJ01vbmV5Tic6XG4gICAgICAgICAgY2FzZSAnQml0Tic6XG4gICAgICAgICAgY2FzZSAnVW5pcXVlSWRlbnRpZmllcic6XG4gICAgICAgICAgY2FzZSAnRGF0ZVRpbWVOJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZXIucmVhZFVJbnQ4KChkYXRhTGVuZ3RoKSA9PiB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICB1c2VyVHlwZTogdXNlclR5cGUsXG4gICAgICAgICAgICAgICAgZmxhZ3M6IGZsYWdzLFxuICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICAgICAgY29sbGF0aW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgc2NhbGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBkYXRhTGVuZ3RoOiBkYXRhTGVuZ3RoLFxuICAgICAgICAgICAgICAgIHNjaGVtYTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHVkdEluZm86IHVuZGVmaW5lZFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY2FzZSAnVmFyaWFudCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VyLnJlYWRVSW50MzJMRSgoZGF0YUxlbmd0aCkgPT4ge1xuICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgdXNlclR5cGU6IHVzZXJUeXBlLFxuICAgICAgICAgICAgICAgIGZsYWdzOiBmbGFncyxcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgICAgIGNvbGxhdGlvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHNjYWxlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgZGF0YUxlbmd0aDogZGF0YUxlbmd0aCxcbiAgICAgICAgICAgICAgICBzY2hlbWE6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB1ZHRJbmZvOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNhc2UgJ1ZhckNoYXInOlxuICAgICAgICAgIGNhc2UgJ0NoYXInOlxuICAgICAgICAgIGNhc2UgJ05WYXJDaGFyJzpcbiAgICAgICAgICBjYXNlICdOQ2hhcic6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VyLnJlYWRVSW50MTZMRSgoZGF0YUxlbmd0aCkgPT4ge1xuICAgICAgICAgICAgICByZWFkQ29sbGF0aW9uKHBhcnNlciwgKGNvbGxhdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgIHVzZXJUeXBlOiB1c2VyVHlwZSxcbiAgICAgICAgICAgICAgICAgIGZsYWdzOiBmbGFncyxcbiAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICAgICAgICBjb2xsYXRpb246IGNvbGxhdGlvbixcbiAgICAgICAgICAgICAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgc2NhbGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIGRhdGFMZW5ndGg6IGRhdGFMZW5ndGgsXG4gICAgICAgICAgICAgICAgICBzY2hlbWE6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIHVkdEluZm86IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY2FzZSAnVGV4dCc6XG4gICAgICAgICAgY2FzZSAnTlRleHQnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlci5yZWFkVUludDMyTEUoKGRhdGFMZW5ndGgpID0+IHtcbiAgICAgICAgICAgICAgcmVhZENvbGxhdGlvbihwYXJzZXIsIChjb2xsYXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICB1c2VyVHlwZTogdXNlclR5cGUsXG4gICAgICAgICAgICAgICAgICBmbGFnczogZmxhZ3MsXG4gICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgICAgICAgY29sbGF0aW9uOiBjb2xsYXRpb24sXG4gICAgICAgICAgICAgICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIHNjYWxlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBkYXRhTGVuZ3RoOiBkYXRhTGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgc2NoZW1hOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICB1ZHRJbmZvOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNhc2UgJ1ZhckJpbmFyeSc6XG4gICAgICAgICAgY2FzZSAnQmluYXJ5JzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZXIucmVhZFVJbnQxNkxFKChkYXRhTGVuZ3RoKSA9PiB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICB1c2VyVHlwZTogdXNlclR5cGUsXG4gICAgICAgICAgICAgICAgZmxhZ3M6IGZsYWdzLFxuICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICAgICAgY29sbGF0aW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgc2NhbGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBkYXRhTGVuZ3RoOiBkYXRhTGVuZ3RoLFxuICAgICAgICAgICAgICAgIHNjaGVtYTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHVkdEluZm86IHVuZGVmaW5lZFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY2FzZSAnSW1hZ2UnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlci5yZWFkVUludDMyTEUoKGRhdGFMZW5ndGgpID0+IHtcbiAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHVzZXJUeXBlOiB1c2VyVHlwZSxcbiAgICAgICAgICAgICAgICBmbGFnczogZmxhZ3MsXG4gICAgICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgICAgICBjb2xsYXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBzY2FsZTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIGRhdGFMZW5ndGg6IGRhdGFMZW5ndGgsXG4gICAgICAgICAgICAgICAgc2NoZW1hOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgdWR0SW5mbzogdW5kZWZpbmVkXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjYXNlICdYbWwnOlxuICAgICAgICAgICAgcmV0dXJuIHJlYWRTY2hlbWEocGFyc2VyLCAoc2NoZW1hKSA9PiB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICB1c2VyVHlwZTogdXNlclR5cGUsXG4gICAgICAgICAgICAgICAgZmxhZ3M6IGZsYWdzLFxuICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICAgICAgY29sbGF0aW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgc2NhbGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBkYXRhTGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgICAgICAgICAgICAgdWR0SW5mbzogdW5kZWZpbmVkXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjYXNlICdUaW1lJzpcbiAgICAgICAgICBjYXNlICdEYXRlVGltZTInOlxuICAgICAgICAgIGNhc2UgJ0RhdGVUaW1lT2Zmc2V0JzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZXIucmVhZFVJbnQ4KChzY2FsZSkgPT4ge1xuICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgdXNlclR5cGU6IHVzZXJUeXBlLFxuICAgICAgICAgICAgICAgIGZsYWdzOiBmbGFncyxcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgICAgIGNvbGxhdGlvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHNjYWxlOiBzY2FsZSxcbiAgICAgICAgICAgICAgICBkYXRhTGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgc2NoZW1hOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgdWR0SW5mbzogdW5kZWZpbmVkXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjYXNlICdOdW1lcmljTic6XG4gICAgICAgICAgY2FzZSAnRGVjaW1hbE4nOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlci5yZWFkVUludDgoKGRhdGFMZW5ndGgpID0+IHtcbiAgICAgICAgICAgICAgcGFyc2VyLnJlYWRVSW50OCgocHJlY2lzaW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgcGFyc2VyLnJlYWRVSW50OCgoc2NhbGUpID0+IHtcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgdXNlclR5cGU6IHVzZXJUeXBlLFxuICAgICAgICAgICAgICAgICAgICBmbGFnczogZmxhZ3MsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxhdGlvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBwcmVjaXNpb246IHByZWNpc2lvbixcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHNjYWxlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhTGVuZ3RoOiBkYXRhTGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBzY2hlbWE6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgdWR0SW5mbzogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNhc2UgJ1VEVCc6XG4gICAgICAgICAgICByZXR1cm4gcmVhZFVEVEluZm8ocGFyc2VyLCAodWR0SW5mbykgPT4ge1xuICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgdXNlclR5cGU6IHVzZXJUeXBlLFxuICAgICAgICAgICAgICAgIGZsYWdzOiBmbGFncyxcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgICAgIGNvbGxhdGlvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHNjYWxlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgZGF0YUxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHNjaGVtYTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHVkdEluZm86IHVkdEluZm9cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3ByaW50ZignVW5yZWNvZ25pc2VkIHR5cGUgJXMnLCB0eXBlLm5hbWUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBtZXRhZGF0YVBhcnNlO1xuZXhwb3J0IHsgcmVhZENvbGxhdGlvbiB9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1ldGFkYXRhUGFyc2U7XG5tb2R1bGUuZXhwb3J0cy5yZWFkQ29sbGF0aW9uID0gcmVhZENvbGxhdGlvbjtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7QUFFQTs7QUFHQTs7QUFtREEsU0FBU0EsYUFBVCxDQUF1QkMsTUFBdkIsRUFBdUNDLFFBQXZDLEVBQWlGO0VBQy9FO0VBQ0FELE1BQU0sQ0FBQ0UsVUFBUCxDQUFrQixDQUFsQixFQUFzQkMsYUFBRCxJQUFtQjtJQUN0Q0YsUUFBUSxDQUFDRyxxQkFBVUMsVUFBVixDQUFxQkYsYUFBckIsQ0FBRCxDQUFSO0VBQ0QsQ0FGRDtBQUdEOztBQUVELFNBQVNHLFVBQVQsQ0FBb0JOLE1BQXBCLEVBQW9DQyxRQUFwQyxFQUF1RjtFQUNyRjtFQUNBRCxNQUFNLENBQUNPLFNBQVAsQ0FBa0JDLGFBQUQsSUFBbUI7SUFDbEMsSUFBSUEsYUFBYSxLQUFLLElBQXRCLEVBQTRCO01BQzFCUixNQUFNLENBQUNTLFlBQVAsQ0FBcUJDLE1BQUQsSUFBWTtRQUM5QlYsTUFBTSxDQUFDUyxZQUFQLENBQXFCRSxZQUFELElBQWtCO1VBQ3BDWCxNQUFNLENBQUNZLGFBQVAsQ0FBc0JDLG1CQUFELElBQXlCO1lBQzVDWixRQUFRLENBQUM7Y0FDUFMsTUFBTSxFQUFFQSxNQUREO2NBRVBDLFlBQVksRUFBRUEsWUFGUDtjQUdQRSxtQkFBbUIsRUFBRUE7WUFIZCxDQUFELENBQVI7VUFLRCxDQU5EO1FBT0QsQ0FSRDtNQVNELENBVkQ7SUFXRCxDQVpELE1BWU87TUFDTFosUUFBUSxDQUFDYSxTQUFELENBQVI7SUFDRDtFQUNGLENBaEJEO0FBaUJEOztBQUVELFNBQVNDLFdBQVQsQ0FBcUJmLE1BQXJCLEVBQXFDQyxRQUFyQyxFQUF1RjtFQUNyRkQsTUFBTSxDQUFDZ0IsWUFB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