"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _crypto = _interopRequireDefault(require("crypto"));

var _os = _interopRequireDefault(require("os"));

var _dns = _interopRequireDefault(require("dns"));

var _constants = _interopRequireDefault(require("constants"));

var _stream = require("stream");

var _bulkLoad = _interopRequireDefault(require("./bulk-load"));

var _debug = _interopRequireDefault(require("./debug"));

var _events = require("events");

var _instanceLookup = require("./instance-lookup");

var _transientErrorLookup = require("./transient-error-lookup");

var _packet = require("./packet");

var _preloginPayload = _interopRequireDefault(require("./prelogin-payload"));

var _login7Payload = _interopRequireDefault(require("./login7-payload"));

var _ntlmPayload = _interopRequireDefault(require("./ntlm-payload"));

var _request = _interopRequireDefault(require("./request"));

var _rpcrequestPayload = _interopRequireDefault(require("./rpcrequest-payload"));

var _sqlbatchPayload = _interopRequireDefault(require("./sqlbatch-payload"));

var _messageIo = _interopRequireDefault(require("./message-io"));

var _tokenStreamParser = require("./token/token-stream-parser");

var _transaction = require("./transaction");

var _errors = require("./errors");

var _connector = require("./connector");

var _library = require("./library");

var _tdsVersions = require("./tds-versions");

var _message = _interopRequireDefault(require("./message"));

var _ntlm = require("./ntlm");

var _nodeAbortController = require("node-abort-controller");

var _dataType = require("./data-type");

var _bulkLoadPayload = require("./bulk-load-payload");

var _esAggregateError = _interopRequireDefault(require("es-aggregate-error"));

var _package = require("../package.json");

var _url = require("url");

var _handler = require("./token/handler");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @private
 */
const KEEP_ALIVE_INITIAL_DELAY = 30 * 1000;
/**
 * @private
 */

const DEFAULT_CONNECT_TIMEOUT = 15 * 1000;
/**
 * @private
 */

const DEFAULT_CLIENT_REQUEST_TIMEOUT = 15 * 1000;
/**
 * @private
 */

const DEFAULT_CANCEL_TIMEOUT = 5 * 1000;
/**
 * @private
 */

const DEFAULT_CONNECT_RETRY_INTERVAL = 500;
/**
 * @private
 */

const DEFAULT_PACKET_SIZE = 4 * 1024;
/**
 * @private
 */

const DEFAULT_TEXTSIZE = 2147483647;
/**
 * @private
 */

const DEFAULT_DATEFIRST = 7;
/**
 * @private
 */

const DEFAULT_PORT = 1433;
/**
 * @private
 */

const DEFAULT_TDS_VERSION = '7_4';
/**
 * @private
 */

const DEFAULT_LANGUAGE = 'us_english';
/**
 * @private
 */

const DEFAULT_DATEFORMAT = 'mdy';

/**
 * @private
 */
const CLEANUP_TYPE = {
  NORMAL: 0,
  REDIRECT: 1,
  RETRY: 2
};

/**
 * A [[Connection]] instance represents a single connection to a database server.
 *
 * ```js
 * var Connection = require('tedious').Connection;
 * var config = {
 *  "authentication": {
 *    ...,
 *    "options": {...}
 *  },
 *  "options": {...}
 * };
 * var connection = new Connection(config);
 * ```
 *
 * Only one request at a time may be executed on a connection. Once a [[Request]]
 * has been initiated (with [[Connection.callProcedure]], [[Connection.execSql]],
 * or [[Connection.execSqlBatch]]), another should not be initiated until the
 * [[Request]]'s completion callback is called.
 */
class Connection extends _events.EventEmitter {
  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * Note: be aware of the different options field:
   * 1. config.authentication.options
   * 2. config.options
   *
   * ```js
   * const { Connection } = require('tedious');
   *
   * const config = {
   *  "authentication": {
   *    ...,
   *    "options": {...}
   *  },
   *  "options": {...}
   * };
   *
   * const connection = new Connection(config);
   * ```
   *
   * @param config
   */
  constructor(config) {
    super();
    this.fedAuthRequired = void 0;
    this.config = void 0;
    this.secureContextOptions = void 0;
    this.inTransaction = void 0;
    this.transactionDescriptors = void 0;
    this.transactionDepth = void 0;
    this.isSqlBatch = void 0;
    this.curTransientRetryCount = void 0;
    this.transientErrorLookup = void 0;
    this.closed = void 0;
    this.loginError = void 0;
    this.debug = void 0;
    this.ntlmpacket = void 0;
    this.ntlmpacketBuffer = void 0;
    this.routingData = void 0;
    this.messageIo = void 0;
    this.state = void 0;
    this.resetConnectionOnNextRequest = void 0;
    this.request = void 0;
    this.procReturnStatusValue = void 0;
    this.socket = void 0;
    this.messageBuffer = void 0;
    this.connectTimer = void 0;
    this.cancelTimer = void 0;
    this.requestTimer = void 0;
    this.retryTimer = void 0;
    this._cancelAfterRequestSent = void 0;
    this.databaseCollation = void 0;

    if (typeof config !== 'object' || config === null) {
      throw new TypeError('The "config" argument is required and must be of type Object.');
    }

    if (typeof config.server !== 'string') {
      throw new TypeError('The "config.server" property is required and must be of type string.');
    }

    this.fedAuthRequired = false;
    let authentication;

    if (config.authentication !== undefined) {
      if (typeof config.authentication !== 'object' || config.authentication === null) {
        throw new TypeError('The "config.authentication" property must be of type Object.');
      }

      const type = config.authentication.type;
      const options = config.authentication.options === undefined ? {} : config.authentication.options;

      if (typeof type !== 'string') {
        throw new TypeError('The "config.authentication.type" property must be of type string.');
      }

      if (type !== 'default' && type !== 'ntlm' && type !== 'azure-active-directory-password' && type !== 'azure-active-directory-access-token' && type !== 'azure-active-directory-msi-vm' && type !== 'azure-active-directory-msi-app-service' && type !== 'azure-active-directory-service-principal-secret' && type !== 'azure-active-directory-default') {
        throw new TypeError('The "type" property must one of "default", "ntlm", "azure-active-directory-password", "azure-active-directory-access-token", "azure-active-directory-default", "azure-active-directory-msi-vm" or "azure-active-directory-msi-app-service" or "azure-active-directory-service-principal-secret".');
      }

      if (typeof options !== 'object' || options === null) {
        throw new TypeError('The "config.authentication.options" property must be of type object.');
      }

      if (type === 'ntlm') {
        if (typeof options.domain !== 'string') {
          throw new TypeError('The "config.authentication.options.domain" property must be of type string.');
        }

        if (options.userName !== undefined && typeof options.userName !== 'string') {
          throw new TypeError('The "config.authentication.options.userName" property must be of type string.');
        }

        if (options.password !== undefined && typeof options.password !== 'string') {
          throw new TypeError('The "config.authentication.options.password" property must be of type string.');
        }

        authentication = {
          type: 'ntlm',
          options: {
            userName: options.userName,
            password: options.password,
            domain: options.domain && options.domain.toUpperCase()
          }
        };
      } else if (type === 'azure-active-directory-password') {
        if (typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        if (options.userName !== undefined && typeof options.userName !== 'string') {
          throw new TypeError('The "config.authentication.options.userName" property must be of type string.');
        }

        if (options.password !== undefined && typeof options.password !== 'string') {
          throw new TypeError('The "config.authentication.options.password" property must be of type string.');
        }

        if (options.tenantId !== undefined && typeof options.tenantId !== 'string') {
          throw new TypeError('The "config.authentication.options.tenantId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-password',
          options: {
            userName: options.userName,
            password: options.password,
            tenantId: options.tenantId,
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-access-token') {
        if (typeof options.token !== 'string') {
          throw new TypeError('The "config.authentication.options.token" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-access-token',
          options: {
            token: options.token
          }
        };
      } else if (type === 'azure-active-directory-msi-vm') {
        if (options.clientId !== undefined && typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-msi-vm',
          options: {
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-default') {
        if (options.clientId !== undefined && typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-default',
          options: {
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-msi-app-service') {
        if (options.clientId !== undefined && typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-msi-app-service',
          options: {
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-service-principal-secret') {
        if (typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        if (typeof options.clientSecret !== 'string') {
          throw new TypeError('The "config.authentication.options.clientSecret" property must be of type string.');
        }

        if (typeof options.tenantId !== 'string') {
          throw new TypeError('The "config.authentication.options.tenantId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-service-principal-secret',
          options: {
            clientId: options.clientId,
            clientSecret: options.clientSecret,
            tenantId: options.tenantId
          }
        };
      } else {
        if (options.userName !== undefined && typeof options.userName !== 'string') {
          throw new TypeError('The "config.authentication.options.userName" property must be of type string.');
        }

        if (options.password !== undefined && typeof options.password !== 'string') {
          throw new TypeError('The "config.authentication.options.password" property must be of type string.');
        }

        authentication = {
          type: 'default',
          options: {
            userName: options.userName,
            password: options.password
          }
        };
      }
    } else {
      authentication = {
        type: 'default',
        options: {
          userName: undefined,
          password: undefined
        }
      };
    }

    this.config = {
      server: config.server,
      authentication: authentication,
      options: {
        abortTransactionOnError: false,
        appName: undefined,
        camelCaseColumns: false,
        cancelTimeout: DEFAULT_CANCEL_TIMEOUT,
        columnEncryptionKeyCacheTTL: 2 * 60 * 60 * 1000,
        // Units: miliseconds
        columnEncryptionSetting: false,
        columnNameReplacer: undefined,
        connectionRetryInterval: DEFAULT_CONNECT_RETRY_INTERVAL,
        connectTimeout: DEFAULT_CONNECT_TIMEOUT,
        connectionIsolationLevel: _transaction.ISOLATION_LEVEL.READ_COMMITTED,
        cryptoCredentialsDetails: {},
        database: undefined,
        datefirst: DEFAULT_DATEFIRST,
        dateFormat: DEFAULT_DATEFORMAT,
        debug: {
          data: false,
          packet: false,
          payload: false,
          token: false
        },
        enableAnsiNull: true,
        enableAnsiNullDefault: true,
        enableAnsiPadding: true,
        enableAnsiWarnings: true,
        enableArithAbort: true,
        enableConcatNullYieldsNull: true,
        enableCursorCloseOnCommit: null,
        enableImplicitTransactions: false,
        enableNumericRoundabort: false,
        enableQuotedIdentifier: true,
        encrypt: true,
        fallbackToDefaultDb: false,
        encryptionKeyStoreProviders: undefined,
        instanceName: undefined,
        isolationLevel: _transaction.ISOLATION_LEVEL.READ_COMMITTED,
        language: DEFAULT_LANGUAGE,
        localAddress: undefined,
        maxRetriesOnTransientErrors: 3,
        multiSubnetFailover: false,
        packetSize: DEFAULT_PACKET_SIZE,
        port: DEFAULT_PORT,
        readOnlyIntent: false,
        requestTimeout: DEFAULT_CLIENT_REQUEST_TIMEOUT,
        rowCollectionOnDone: false,
        rowCollectionOnRequestCompletion: false,
        serverName: undefined,
        serverSupportsColumnEncryption: false,
        tdsVersion: DEFAULT_TDS_VERSION,
        textsize: DEFAULT_TEXTSIZE,
        trustedServerNameAE: undefined,
        trustServerCertificate: false,
        useColumnNames: false,
        useUTC: true,
        workstationId: undefined,
        lowerCaseGuids: false
      }
    };

    if (config.options) {
      if (config.options.port && config.options.instanceName) {
        throw new Error('Port and instanceName are mutually exclusive, but ' + config.options.port + ' and ' + config.options.instanceName + ' provided');
      }

      if (config.options.abortTransactionOnError !== undefined) {
        if (typeof config.options.abortTransactionOnError !== 'boolean' && config.options.abortTransactionOnError !== null) {
          throw new TypeError('The "config.options.abortTransactionOnError" property must be of type string or null.');
        }

        this.config.options.abortTransactionOnError = config.options.abortTransactionOnError;
      }

      if (config.options.appName !== undefined) {
        if (typeof config.options.appName !== 'string') {
          throw new TypeError('The "config.options.appName" property must be of type string.');
        }

        this.config.options.appName = config.options.appName;
      }

      if (config.options.camelCaseColumns !== undefined) {
        if (typeof config.options.camelCaseColumns !== 'boolean') {
          throw new TypeError('The "config.options.camelCaseColumns" property must be of type boolean.');
        }

        this.config.options.camelCaseColumns = config.options.camelCaseColumns;
      }

      if (config.options.cancelTimeout !== undefined) {
        if (typeof config.options.cancelTimeout !== 'number') {
          throw new TypeError('The "config.options.cancelTimeout" property must be of type number.');
        }

        this.config.options.cancelTimeout = config.options.cancelTimeout;
      }

      if (config.options.columnNameReplacer) {
        if (typeof config.options.columnNameReplacer !== 'function') {
          throw new TypeError('The "config.options.cancelTimeout" property must be of type function.');
        }

        this.config.options.columnNameReplacer = config.options.columnNameReplacer;
      }

      if (config.options.connectionIsolationLevel !== undefined) {
        (0, _transaction.assertValidIsolationLevel)(config.options.connectionIsolationLevel, 'config.options.connectionIsolationLevel');
        this.config.options.connectionIsolationLevel = config.options.connectionIsolationLevel;
      }

      if (config.options.connectTimeout !== undefined) {
        if (typeof config.options.connectTimeout !== 'number') {
          throw new TypeError('The "config.options.connectTimeout" property must be of type number.');
        }

        this.config.options.connectTimeout = config.options.connectTimeout;
      }

      if (config.options.cryptoCredentialsDetails !== undefined) {
        if (typeof config.options.cryptoCredentialsDetails !== 'object' || config.options.cryptoCredentialsDetails === null) {
          throw new TypeError('The "config.options.cryptoCredentialsDetails" property must be of type Object.');
        }

        this.config.options.cryptoCredentialsDetails = config.options.cryptoCredentialsDetails;
      }

      if (config.options.database !== undefined) {
        if (typeof config.options.database !== 'string') {
          throw new TypeError('The "config.options.database" property must be of type string.');
        }

        this.config.options.database = config.options.database;
      }

      if (config.options.datefirst !== undefined) {
        if (typeof config.options.datefirst !== 'number' && config.options.datefirst !== null) {
          throw new TypeError('The "config.options.datefirst" property must be of type number.');
        }

        if (config.options.datefirst !== null && (config.options.datefirst < 1 || config.options.datefirst > 7)) {
          throw new RangeError('The "config.options.datefirst" property must be >= 1 and <= 7');
        }

        this.config.options.datefirst = config.options.datefirst;
      }

      if (config.options.dateFormat !== undefined) {
        if (typeof config.options.dateFormat !== 'string' && config.options.dateFormat !== null) {
          throw new TypeError('The "config.options.dateFormat" property must be of type string or null.');
        }

        this.config.options.dateFormat = config.options.dateFormat;
      }

      if (config.options.debug) {
        if (config.options.debug.data !== undefined) {
          if (typeof config.options.debug.data !== 'boolean') {
            throw new TypeError('The "config.options.debug.data" property must be of type boolean.');
          }

          this.config.options.debug.data = config.options.debug.data;
        }

        if (config.options.debug.packet !== undefined) {
          if (typeof config.options.debug.packet !== 'boolean') {
            throw new TypeError('The "config.options.debug.packet" property must be of type boolean.');
          }

          this.config.options.debug.packet = config.options.debug.packet;
        }

        if (config.options.debug.payload !== undefined) {
          if (typeof config.options.debug.payload !== 'boolean') {
            throw new TypeError('The "config.options.debug.payload" property must be of type boolean.');
          }

          this.config.options.debug.payload = config.options.debug.payload;
        }

        if (config.options.debug.token !== undefined) {
          if (typeof config.options.debug.token !== 'boolean') {
            throw new TypeError('The "config.options.debug.token" property must be of type boolean.');
          }

          this.config.options.debug.token = config.options.debug.token;
        }
      }

      if (config.options.enableAnsiNull !== undefined) {
        if (typeof config.options.enableAnsiNull !== 'boolean' && config.options.enableAnsiNull !== null) {
          throw new TypeError('The "config.options.enableAnsiNull" property must be of type boolean or null.');
        }

        this.config.options.enableAnsiNull = config.options.enableAnsiNull;
      }

      if (config.options.enableAnsiNullDefault !== undefined) {
        if (typeof config.options.enableAnsiNullDefault !== 'boolean' && config.options.enableAnsiNullDefault !== null) {
          throw new TypeError('The "config.options.enableAnsiNullDefault" property must be of type boolean or null.');
        }

        this.config.options.enableAnsiNullDefault = config.options.enableAnsiNullDefault;
      }

      if (config.options.enableAnsiPadding !== undefined) {
        if (typeof config.options.enableAnsiPadding !== 'boolean' && config.options.enableAnsiPadding !== null) {
          throw new TypeError('The "config.options.enableAnsiPadding" property must be of type boolean or null.');
        }

        this.config.options.enableAnsiPadding = config.options.enableAnsiPadding;
      }

      if (config.options.enableAnsiWarnings !== undefined) {
        if (typeof config.options.enableAnsiWarnings !== 'boolean' && config.options.enableAnsiWarnings !== null) {
          throw new TypeError('The "config.options.enableAnsiWarnings" property must be of type boolean or null.');
        }

        this.config.options.enableAnsiWarnings = config.options.enableAnsiWarnings;
      }

      if (config.options.enableArithAbort !== undefined) {
        if (typeof config.options.enableArithAbort !== 'boolean' && config.options.enableArithAbort !== null) {
          throw new TypeError('The "config.options.enableArithAbort" property must be of type boolean or null.');
        }

        this.config.options.enableArithAbort = config.options.enableArithAbort;
      }

      if (config.options.enableConcatNullYieldsNull !== undefined) {
        if (typeof config.options.enableConcatNullYieldsNull !== 'boolean' && config.options.enableConcatNullYieldsNull !== null) {
          throw new TypeError('The "config.options.enableConcatNullYieldsNull" property must be of type boolean or null.');
        }

        this.config.options.enableConcatNullYieldsNull = config.options.enableConcatNullYieldsNull;
      }

      if (config.options.enableCursorCloseOnCommit !== undefined) {
        if (typeof config.options.enableCursorCloseOnCommit !== 'boolean' && config.options.enableCursorCloseOnCommit !== null) {
          throw new TypeError('The "config.options.enableCursorCloseOnCommit" property must be of type boolean or null.');
        }

        this.config.options.enableCursorCloseOnCommit = config.options.enableCursorCloseOnCommit;
      }

      if (config.options.enableImplicitTransactions !== undefined) {
        if (typeof config.options.enableImplicitTransactions !== 'boolean' && config.options.enableImplicitTransactions !== null) {
          throw new TypeError('The "config.options.enableImplicitTransactions" property must be of type boolean or null.');
        }

        this.config.options.enableImplicitTransactions = config.options.enableImplicitTransactions;
      }

      if (config.options.enableNumericRoundabort !== undefined) {
        if (typeof config.options.enableNumericRoundabort !== 'boolean' && config.options.enableNumericRoundabort !== null) {
          throw new TypeError('The "config.options.enableNumericRoundabort" property must be of type boolean or null.');
        }

        this.config.options.enableNumericRoundabort = config.options.enableNumericRoundabort;
      }

      if (config.options.enableQuotedIdentifier !== undefined) {
        if (typeof config.options.enableQuotedIdentifier !== 'boolean' && config.options.enableQuotedIdentifier !== null) {
          throw new TypeError('The "config.options.enableQuotedIdentifier" property must be of type boolean or null.');
        }

        this.config.options.enableQuotedIdentifier = config.options.enableQuotedIdentifier;
      }

      if (config.options.encrypt !== undefined) {
        if (typeof config.options.encrypt !== 'boolean') {
          throw new TypeError('The "config.options.encrypt" property must be of type boolean.');
        }

        this.config.options.encrypt = config.options.encrypt;
      }

      if (config.options.fallbackToDefaultDb !== undefined) {
        if (typeof config.options.fallbackToDefaultDb !== 'boolean') {
          throw new TypeError('The "config.options.fallbackToDefaultDb" property must be of type boolean.');
        }

        this.config.options.fallbackToDefaultDb = config.options.fallbackToDefaultDb;
      }

      if (config.options.instanceName !== undefined) {
        if (typeof config.options.instanceName !== 'string') {
          throw new TypeError('The "config.options.instanceName" property must be of type string.');
        }

        this.config.options.instanceName = config.options.instanceName;
        this.config.options.port = undefined;
      }

      if (config.options.isolationLevel !== undefined) {
        (0, _transaction.assertValidIsolationLevel)(config.options.isolationLevel, 'config.options.isolationLevel');
        this.config.options.isolationLevel = config.options.isolationLevel;
      }

      if (config.options.language !== undefined) {
        if (typeof config.options.language !== 'string' && config.options.language !== null) {
          throw new TypeError('The "config.options.language" property must be of type string or null.');
        }

        this.config.options.language = config.options.language;
      }

      if (config.options.localAddress !== undefined) {
        if (typeof config.options.localAddress !== 'string') {
          throw new TypeError('The "config.options.localAddress" property must be of type string.');
        }

        this.config.options.localAddress = config.options.localAddress;
      }

      if (config.options.multiSubnetFailover !== undefined) {
        if (typeof config.options.multiSubnetFailover !== 'boolean') {
          throw new TypeError('The "config.options.multiSubnetFailover" property must be of type boolean.');
        }

        this.config.options.multiSubnetFailover = config.options.multiSubnetFailover;
      }

      if (config.options.packetSize !== undefined) {
        if (typeof config.options.packetSize !== 'number') {
          throw new TypeError('The "config.options.packetSize" property must be of type number.');
        }

        this.config.options.packetSize = config.options.packetSize;
      }

      if (config.options.port !== undefined) {
        if (typeof config.options.port !== 'number') {
          throw new TypeError('The "config.options.port" property must be of type number.');
        }

        if (config.options.port <= 0 || config.options.port >= 65536) {
          throw new RangeError('The "config.options.port" property must be > 0 and < 65536');
        }

        this.config.options.port = config.options.port;
        this.config.options.instanceName = undefined;
      }

      if (config.options.readOnlyIntent !== undefined) {
        if (typeof config.options.readOnlyIntent !== 'boolean') {
          throw new TypeError('The "config.options.readOnlyIntent" property must be of type boolean.');
        }

        this.config.options.readOnlyIntent = config.options.readOnlyIntent;
      }

      if (config.options.requestTimeout !== undefined) {
        if (typeof config.options.requestTimeout !== 'number') {
          throw new TypeError('The "config.options.requestTimeout" property must be of type number.');
        }

        this.config.options.requestTimeout = config.options.requestTimeout;
      }

      if (config.options.maxRetriesOnTransientErrors !== undefined) {
        if (typeof config.options.maxRetriesOnTransientErrors !== 'number') {
          throw new TypeError('The "config.options.maxRetriesOnTransientErrors" property must be of type number.');
        }

        if (config.options.maxRetriesOnTransientErrors < 0) {
          throw new TypeError('The "config.options.maxRetriesOnTransientErrors" property must be equal or greater than 0.');
        }

        this.config.options.maxRetriesOnTransientErrors = config.options.maxRetriesOnTransientErrors;
      }

      if (config.options.connectionRetryInterval !== undefined) {
        if (typeof config.options.connectionRetryInterval !== 'number') {
          throw new TypeError('The "config.options.connectionRetryInterval" property must be of type number.');
        }

        if (config.options.connectionRetryInterval <= 0) {
          throw new TypeError('The "config.options.connectionRetryInterval" property must be greater than 0.');
        }

        this.config.options.connectionRetryInterval = config.options.connectionRetryInterval;
      }

      if (config.options.rowCollectionOnDone !== undefined) {
        if (typeof config.options.rowCollectionOnDone !== 'boolean') {
          throw new TypeError('The "config.options.rowCollectionOnDone" property must be of type boolean.');
        }

        this.config.options.rowCollectionOnDone = config.options.rowCollectionOnDone;
      }

      if (config.options.rowCollectionOnRequestCompletion !== undefined) {
        if (typeof config.options.rowCollectionOnRequestCompletion !== 'boolean') {
          throw new TypeError('The "config.options.rowCollectionOnRequestCompletion" property must be of type boolean.');
        }

        this.config.options.rowCollectionOnRequestCompletion = config.options.rowCollectionOnRequestCompletion;
      }

      if (config.options.tdsVersion !== undefined) {
        if (typeof config.options.tdsVersion !== 'string') {
          throw new TypeError('The "config.options.tdsVersion" property must be of type string.');
        }

        this.config.options.tdsVersion = config.options.tdsVersion;
      }

      if (config.options.textsize !== undefined) {
        if (typeof config.options.textsize !== 'number' && config.options.textsize !== null) {
          throw new TypeError('The "config.options.textsize" property must be of type number or null.');
        }

        if (config.options.textsize > 2147483647) {
          throw new TypeError('The "config.options.textsize" can\'t be greater than 2147483647.');
        } else if (config.options.textsize < -1) {
          throw new TypeError('The "config.options.textsize" can\'t be smaller than -1.');
        }

        this.config.options.textsize = config.options.textsize | 0;
      }

      if (config.options.trustServerCertificate !== undefined) {
        if (typeof config.options.trustServerCertificate !== 'boolean') {
          throw new TypeError('The "config.options.trustServerCertificate" property must be of type boolean.');
        }

        this.config.options.trustServerCertificate = config.options.trustServerCertificate;
      }

      if (config.options.useColumnNames !== undefined) {
        if (typeof config.options.useColumnNames !== 'boolean') {
          throw new TypeError('The "config.options.useColumnNames" property must be of type boolean.');
        }

        this.config.options.useColumnNames = config.options.useColumnNames;
      }

      if (config.options.useUTC !== undefined) {
        if (typeof config.options.useUTC !== 'boolean') {
          throw new TypeError('The "config.options.useUTC" property must be of type boolean.');
        }

        this.config.options.useUTC = config.options.useUTC;
      }

      if (config.options.workstationId !== undefined) {
        if (typeof config.options.workstationId !== 'string') {
          throw new TypeError('The "config.options.workstationId" property must be of type string.');
        }

        this.config.options.workstationId = config.options.workstationId;
      }

      if (config.options.lowerCaseGuids !== undefined) {
        if (typeof config.options.lowerCaseGuids !== 'boolean') {
          throw new TypeError('The "config.options.lowerCaseGuids" property must be of type boolean.');
        }

        this.config.options.lowerCaseGuids = config.options.lowerCaseGuids;
      }
    }

    this.secureContextOptions = this.config.options.cryptoCredentialsDetails;

    if (this.secureContextOptions.secureOptions === undefined) {
      // If the caller has not specified their own `secureOptions`,
      // we set `SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS` here.
      // Older SQL Server instances running on older Windows versions have
      // trouble with the BEAST workaround in OpenSSL.
      // As BEAST is a browser specific exploit, we can just disable this option here.
      this.secureContextOptions = Object.create(this.secureContextOptions, {
        secureOptions: {
          value: _constants.default.SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS
        }
      });
    }

    this.debug = this.createDebug();
    this.inTransaction = false;
    this.transactionDescriptors = [Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])]; // 'beginTransaction', 'commitTransaction' and 'rollbackTransaction'
    // events are utilized to maintain inTransaction property state which in
    // turn is used in managing transactions. These events are only fired for
    // TDS version 7.2 and beyond. The properties below are used to emulate
    // equivalent behavior for TDS versions before 7.2.

    this.transactionDepth = 0;
    this.isSqlBatch = false;
    this.closed = false;
    this.messageBuffer = Buffer.alloc(0);
    this.curTransientRetryCount = 0;
    this.transientErrorLookup = new _transientErrorLookup.TransientErrorLookup();
    this.state = this.STATE.INITIALIZED;

    this._cancelAfterRequestSent = () => {
      this.messageIo.sendMessage(_packet.TYPE.ATTENTION);
      this.createCancelTimer();
    };
  }

  connect(connectListener) {
    if (this.state !== this.STATE.INITIALIZED) {
      throw new _errors.ConnectionError('`.connect` can not be called on a Connection in `' + this.state.name + '` state.');
    }

    if (connectListener) {
      const onConnect = err => {
        this.removeListener('error', onError);
        connectListener(err);
      };

      const onError = err => {
        this.removeListener('connect', onConnect);
        connectListener(err);
      };

      this.once('connect', onConnect);
      this.once('error', onError);
    }

    this.transitionTo(this.STATE.CONNECTING);
  }
  /**
   * The server has reported that the charset has changed.
   */


  on(event, listener) {
    return super.on(event, listener);
  }
  /**
   * @private
   */


  emit(event, ...args) {
    return super.emit(event, ...args);
  }
  /**
   * Closes the connection to the database.
   *
   * The [[Event_end]] will be emitted once the connection has been closed.
   */


  close() {
    this.transitionTo(this.STATE.FINAL);
  }
  /**
   * @private
   */


  initialiseConnection() {
    const signal = this.createConnectTimer();

    if (this.config.options.port) {
      return this.connectOnPort(this.config.options.port, this.config.options.multiSubnetFailover, signal);
    } else {
      return (0, _instanceLookup.instanceLookup)({
        server: this.config.server,
        instanceName: this.config.options.instanceName,
        timeout: this.config.options.connectTimeout,
        signal: signal
      }).then(port => {
        process.nextTick(() => {
          this.connectOnPort(port, this.config.options.multiSubnetFailover, signal);
        });
      }, err => {
        this.clearConnectTimer();

        if (err.name === 'AbortError') {
          // Ignore the AbortError for now, this is still handled by the connectTimer firing
          return;
        }

        process.nextTick(() => {
          this.emit('connect', new _errors.ConnectionError(err.message, 'EINSTLOOKUP'));
        });
      });
    }
  }
  /**
   * @private
   */


  cleanupConnection(cleanupType) {
    if (!this.closed) {
      this.clearConnectTimer();
      this.clearRequestTimer();
      this.clearRetryTimer();
      this.closeConnection();

      if (cleanupType === CLEANUP_TYPE.REDIRECT) {
        this.emit('rerouting');
      } else if (cleanupType !== CLEANUP_TYPE.RETRY) {
        process.nextTick(() => {
          this.emit('end');
        });
      }

      const request = this.request;

      if (request) {
        const err = new _errors.RequestError('Connection closed before request completed.', 'ECLOSE');
        request.callback(err);
        this.request = undefined;
      }

      this.closed = true;
      this.loginError = undefined;
    }
  }
  /**
   * @private
   */


  createDebug() {
    const debug = new _debug.default(this.config.options.debug);
    debug.on('debug', message => {
      this.emit('debug', message);
    });
    return debug;
  }
  /**
   * @private
   */


  createTokenStreamParser(message, handler) {
    return new _tokenStreamParser.Parser(message, this.debug, handler, this.config.options);
  }

  connectOnPort(port, multiSubnetFailover, signal) {
    const connectOpts = {
      host: this.routingData ? this.routingData.server : this.config.server,
      port: this.routingData ? this.routingData.port : port,
      localAddress: this.config.options.localAddress
    };
    const connect = multiSubnetFailover ? _connector.connectInParallel : _connector.connectInSequence;
    connect(connectOpts, _dns.default.lookup, signal).then(socket => {
      process.nextTick(() => {
        socket.on('error', error => {
          this.socketError(error);
        });
        socket.on('close', () => {
          this.socketClose();
        });
        socket.on('end', () => {
          this.socketEnd();
        });
        socket.setKeepAlive(true, KEEP_ALIVE_INITIAL_DELAY);
        this.messageIo = new _messageIo.default(socket, this.config.options.packetSize, this.debug);
        this.messageIo.on('secure', cleartext => {
          this.emit('secure', cleartext);
        });
        this.socket = socket;
        this.closed = false;
        this.debug.log('connected to ' + this.config.server + ':' + this.config.options.port);
        this.sendPreLogin();
        this.transitionTo(this.STATE.SENT_PRELOGIN);
      });
    }, err => {
      this.clearConnectTimer();

      if (err.name === 'AbortError') {
        return;
      }

      process.nextTick(() => {
        this.socketError(err);
      });
    });
  }
  /**
   * @private
   */


  closeConnection() {
    if (this.socket) {
      this.socket.destroy();
    }
  }
  /**
   * @private
   */


  createConnectTimer() {
    const controller = new _nodeAbortController.AbortController();
    this.connectTimer = setTimeout(() => {
      controller.abort();
      this.connectTimeout();
    }, this.config.options.connectTimeout);
    return controller.signal;
  }
  /**
   * @private
   */


  createCancelTimer() {
    this.clearCancelTimer();
    const timeout = this.config.options.cancelTimeout;

    if (timeout > 0) {
      this.cancelTimer = setTimeout(() => {
        this.cancelTimeout();
      }, timeout);
    }
  }
  /**
   * @private
   */


  createRequestTimer() {
    this.clearRequestTimer(); // release old timer, just to be safe

    const request = this.request;
    const timeout = request.timeout !== undefined ? request.timeout : this.config.options.requestTimeout;

    if (timeout) {
      this.requestTimer = setTimeout(() => {
        this.requestTimeout();
      }, timeout);
    }
  }
  /**
   * @private
   */


  createRetryTimer() {
    this.clearRetryTimer();
    this.retryTimer = setTimeout(() => {
      this.retryTimeout();
    }, this.config.options.connectionRetryInterval);
  }
  /**
   * @private
   */


  connectTimeout() {
    const message = `Failed to connect to ${this.config.server}${this.config.options.port ? `:${this.config.options.port}` : `\\${this.config.options.instanceName}`} in ${this.config.options.connectTimeout}ms`;
    this.debug.log(message);
    this.emit('connect', new _errors.ConnectionError(message, 'ETIMEOUT'));
    this.connectTimer = undefined;
    this.dispatchEvent('connectTimeout');
  }
  /**
   * @private
   */


  cancelTimeout() {
    const message = `Failed to cancel request in ${this.config.options.cancelTimeout}ms`;
    this.debug.log(message);
    this.dispatchEvent('socketError', new _errors.ConnectionError(message, 'ETIMEOUT'));
  }
  /**
   * @private
   */


  requestTimeout() {
    this.requestTimer = undefined;
    const request = this.request;
    request.cancel();
    const timeout = request.timeout !== undefined ? request.timeout : this.config.options.requestTimeout;
    const message = 'Timeout: Request failed to complete in ' + timeout + 'ms';
    request.error = new _errors.RequestError(message, 'ETIMEOUT');
  }
  /**
   * @private
   */


  retryTimeout() {
    this.retryTimer = undefined;
    this.emit('retry');
    this.transitionTo(this.STATE.CONNECTING);
  }
  /**
   * @private
   */


  clearConnectTimer() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
  }
  /**
   * @private
   */


  clearCancelTimer() {
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = undefined;
    }
  }
  /**
   * @private
   */


  clearRequestTimer() {
    if (this.requestTimer) {
      clearTimeout(this.requestTimer);
      this.requestTimer = undefined;
    }
  }
  /**
   * @private
   */


  clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }
  /**
   * @private
   */


  transitionTo(newState) {
    if (this.state === newState) {
      this.debug.log('State is already ' + newState.name);
      return;
    }

    if (this.state && this.state.exit) {
      this.state.exit.call(this, newState);
    }

    this.debug.log('State change: ' + (this.state ? this.state.name : 'undefined') + ' -> ' + newState.name);
    this.state = newState;

    if (this.state.enter) {
      this.state.enter.apply(this);
    }
  }
  /**
   * @private
   */


  getEventHandler(eventName) {
    const handler = this.state.events[eventName];

    if (!handler) {
      throw new Error(`No event '${eventName}' in state '${this.state.name}'`);
    }

    return handler;
  }
  /**
   * @private
   */


  dispatchEvent(eventName, ...args) {
    const handler = this.state.events[eventName];

    if (handler) {
      handler.apply(this, args);
    } else {
      this.emit('error', new Error(`No event '${eventName}' in state '${this.state.name}'`));
      this.close();
    }
  }
  /**
   * @private
   */


  socketError(error) {
    if (this.state === this.STATE.CONNECTING || this.state === this.STATE.SENT_TLSSSLNEGOTIATION) {
      const message = `Failed to connect to ${this.config.server}:${this.config.options.port} - ${error.message}`;
      this.debug.log(message);
      this.emit('connect', new _errors.ConnectionError(message, 'ESOCKET'));
    } else {
      const message = `Connection lost - ${error.message}`;
      this.debug.log(message);
      this.emit('error', new _errors.ConnectionError(message, 'ESOCKET'));
    }

    this.dispatchEvent('socketError', error);
  }
  /**
   * @private
   */


  socketEnd() {
    this.debug.log('socket ended');

    if (this.state !== this.STATE.FINAL) {
      const error = new Error('socket hang up');
      error.code = 'ECONNRESET';
      this.socketError(error);
    }
  }
  /**
   * @private
   */


  socketClose() {
    this.debug.log('connection to ' + this.config.server + ':' + this.config.options.port + ' closed');

    if (this.state === this.STATE.REROUTING) {
      this.debug.log('Rerouting to ' + this.routingData.server + ':' + this.routingData.port);
      this.dispatchEvent('reconnect');
    } else if (this.state === this.STATE.TRANSIENT_FAILURE_RETRY) {
      const server = this.routingData ? this.routingData.server : this.config.server;
      const port = this.routingData ? this.routingData.port : this.config.options.port;
      this.debug.log('Retry after transient failure connecting to ' + server + ':' + port);
      this.dispatchEvent('retry');
    } else {
      this.transitionTo(this.STATE.FINAL);
    }
  }
  /**
   * @private
   */


  sendPreLogin() {
    const [, major, minor, build] = /^(\d+)\.(\d+)\.(\d+)/.exec(_package.version) ?? ['0.0.0', '0', '0', '0'];
    const payload = new _preloginPayload.default({
      encrypt: this.config.options.encrypt,
      version: {
        major: Number(major),
        minor: Number(minor),
        build: Number(build),
        subbuild: 0
      }
    });
    this.messageIo.sendMessage(_packet.TYPE.PRELOGIN, payload.data);
    this.debug.payload(function () {
      return payload.toString('  ');
    });
  }
  /**
   * @private
   */


  sendLogin7Packet() {
    const payload = new _login7Payload.default({
      tdsVersion: _tdsVersions.versions[this.config.options.tdsVersion],
      packetSize: this.config.options.packetSize,
      clientProgVer: 0,
      clientPid: process.pid,
      connectionId: 0,
      clientTimeZone: new Date().getTimezoneOffset(),
      clientLcid: 0x00000409
    });
    const {
      authentication
    } = this.config;

    switch (authentication.type) {
      case 'azure-active-directory-password':
        payload.fedAuth = {
          type: 'ADAL',
          echo: this.fedAuthRequired,
          workflow: 'default'
        };
        break;

      case 'azure-active-directory-access-token':
        payload.fedAuth = {
          type: 'SECURITYTOKEN',
          echo: this.fedAuthRequired,
          fedAuthToken: authentication.options.token
        };
        break;

      case 'azure-active-directory-msi-vm':
      case 'azure-active-directory-default':
      case 'azure-active-directory-msi-app-service':
      case 'azure-active-directory-service-principal-secret':
        payload.fedAuth = {
          type: 'ADAL',
          echo: this.fedAuthRequired,
          workflow: 'integrated'
        };
        break;

      case 'ntlm':
        payload.sspi = (0, _ntlm.createNTLMRequest)({
          domain: authentication.options.domain
        });
        break;

      default:
        payload.userName = authentication.options.userName;
        payload.password = authentication.options.password;
    }

    payload.hostname = this.config.options.workstationId || _os.default.hostname();
    payload.serverName = this.routingData ? this.routingData.server : this.config.server;
    payload.appName = this.config.options.appName || 'Tedious';
    payload.libraryName = _library.name;
    payload.language = this.config.options.language;
    payload.database = this.config.options.database;
    payload.clientId = Buffer.from([1, 2, 3, 4, 5, 6]);
    payload.readOnlyIntent = this.config.options.readOnlyIntent;
    payload.initDbFatal = !this.config.options.fallbackToDefaultDb;
    this.routingData = undefined;
    this.messageIo.sendMessage(_packet.TYPE.LOGIN7, payload.toBuffer());
    this.debug.payload(function () {
      return payload.toString('  ');
    });
  }
  /**
   * @private
   */


  sendFedAuthTokenMessage(token) {
    const accessTokenLen = Buffer.byteLength(token, 'ucs2');
    const data = Buffer.alloc(8 + accessTokenLen);
    let offset = 0;
    offset = data.writeUInt32LE(accessTokenLen + 4, offset);
    offset = data.writeUInt32LE(accessTokenLen, offset);
    data.write(token, offset, 'ucs2');
    this.messageIo.sendMessage(_packet.TYPE.FEDAUTH_TOKEN, data); // sent the fedAuth token message, the rest is similar to standard login 7

    this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
  }
  /**
   * @private
   */


  sendInitialSql() {
    const payload = new _sqlbatchPayload.default(this.getInitialSql(), this.currentTransactionDescriptor(), this.config.options);
    const message = new _message.default({
      type: _packet.TYPE.SQL_BATCH
    });
    this.messageIo.outgoingMessageStream.write(message);

    _stream.Readable.from(payload).pipe(message);
  }
  /**
   * @private
   */


  getInitialSql() {
    const options = [];

    if (this.config.options.enableAnsiNull === true) {
      options.push('set ansi_nulls on');
    } else if (this.config.options.enableAnsiNull === false) {
      options.push('set ansi_nulls off');
    }

    if (this.config.options.enableAnsiNullDefault === true) {
      options.push('set ansi_null_dflt_on on');
    } else if (this.config.options.enableAnsiNullDefault === false) {
      options.push('set ansi_null_dflt_on off');
    }

    if (this.config.options.enableAnsiPadding === true) {
      options.push('set ansi_padding on');
    } else if (this.config.options.enableAnsiPadding === false) {
      options.push('set ansi_padding off');
    }

    if (this.config.options.enableAnsiWarnings === true) {
      options.push('set ansi_warnings on');
    } else if (this.config.options.enableAnsiWarnings === false) {
      options.push('set ansi_warnings off');
    }

    if (this.config.options.enableArithAbort === true) {
      options.push('set arithabort on');
    } else if (this.config.options.enableArithAbort === false) {
      options.push('set arithabort off');
    }

    if (this.config.options.enableConcatNullYieldsNull === true) {
      options.push('set concat_null_yields_null on');
    } else if (this.config.options.enableConcatNullYieldsNull === false) {
      options.push('set concat_null_yields_null off');
    }

    if (this.config.options.enableCursorCloseOnCommit === true) {
      options.push('set cursor_close_on_commit on');
    } else if (this.config.options.enableCursorCloseOnCommit === false) {
      options.push('set cursor_close_on_commit off');
    }

    if (this.config.options.datefirst !== null) {
      options.push(`set datefirst ${this.config.options.datefirst}`);
    }

    if (this.config.options.dateFormat !== null) {
      options.push(`set dateformat ${this.config.options.dateFormat}`);
    }

    if (this.config.options.enableImplicitTransactions === true) {
      options.push('set implicit_transactions on');
    } else if (this.config.options.enableImplicitTransactions === false) {
      options.push('set implicit_transactions off');
    }

    if (this.config.options.language !== null) {
      options.push(`set language ${this.config.options.language}`);
    }

    if (this.config.options.enableNumericRoundabort === true) {
      options.push('set numeric_roundabort on');
    } else if (this.config.options.enableNumericRoundabort === false) {
      options.push('set numeric_roundabort off');
    }

    if (this.config.options.enableQuotedIdentifier === true) {
      options.push('set quoted_identifier on');
    } else if (this.config.options.enableQuotedIdentifier === false) {
      options.push('set quoted_identifier off');
    }

    if (this.config.options.textsize !== null) {
      options.push(`set textsize ${this.config.options.textsize}`);
    }

    if (this.config.options.connectionIsolationLevel !== null) {
      options.push(`set transaction isolation level ${this.getIsolationLevelText(this.config.options.connectionIsolationLevel)}`);
    }

    if (this.config.options.abortTransactionOnError === true) {
      options.push('set xact_abort on');
    } else if (this.config.options.abortTransactionOnError === false) {
      options.push('set xact_abort off');
    }

    return options.join('\n');
  }
  /**
   * @private
   */


  processedInitialSql() {
    this.clearConnectTimer();
    this.emit('connect');
  }
  /**
   * Execute the SQL batch represented by [[Request]].
   * There is no param support, and unlike [[Request.execSql]],
   * it is not likely that SQL Server will reuse the execution plan it generates for the SQL.
   *
   * In almost all cases, [[Request.execSql]] will be a better choice.
   *
   * @param request A [[Request]] object representing the request.
   */


  execSqlBatch(request) {
    this.makeRequest(request, _packet.TYPE.SQL_BATCH, new _sqlbatchPayload.default(request.sqlTextOrProcedure, this.currentTransactionDescriptor(), this.config.options));
  }
  /**
   *  Execute the SQL represented by [[Request]].
   *
   * As `sp_executesql` is used to execute the SQL, if the same SQL is executed multiples times
   * using this function, the SQL Server query optimizer is likely to reuse the execution plan it generates
   * for the first execution. This may also result in SQL server treating the request like a stored procedure
   * which can result in the [[Event_doneInProc]] or [[Event_doneProc]] events being emitted instead of the
   * [[Event_done]] event you might expect. Using [[execSqlBatch]] will prevent this from occurring but may have a negative performance impact.
   *
   * Beware of the way that scoping rules apply, and how they may [affect local temp tables](http://weblogs.sqlteam.com/mladenp/archive/2006/11/03/17197.aspx)
   * If you're running in to scoping issues, then [[execSqlBatch]] may be a better choice.
   * See also [issue #24](https://github.com/pekim/tedious/issues/24)
   *
   * @param request A [[Request]] object representing the request.
   */


  execSql(request) {
    try {
      request.validateParameters(this.databaseCollation);
    } catch (error) {
      request.error = error;
      process.nextTick(() => {
        this.debug.log(error.message);
        request.callback(error);
      });
      return;
    }

    const parameters = [];
    parameters.push({
      type: _dataType.TYPES.NVarChar,
      name: 'statement',
      value: request.sqlTextOrProcedure,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });

    if (request.parameters.length) {
      parameters.push({
        type: _dataType.TYPES.NVarChar,
        name: 'params',
        value: request.makeParamsParameter(request.parameters),
        output: false,
        length: undefined,
        precision: undefined,
        scale: undefined
      });
      parameters.push(...request.parameters);
    }

    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default('sp_executesql', parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Creates a new BulkLoad instance.
   *
   * @param table The name of the table to bulk-insert into.
   * @param options A set of bulk load options.
   */


  newBulkLoad(table, callbackOrOptions, callback) {
    let options;

    if (callback === undefined) {
      callback = callbackOrOptions;
      options = {};
    } else {
      options = callbackOrOptions;
    }

    if (typeof options !== 'object') {
      throw new TypeError('"options" argument must be an object');
    }

    return new _bulkLoad.default(table, this.databaseCollation, this.config.options, options, callback);
  }
  /**
   * Execute a [[BulkLoad]].
   *
   * ```js
   * // We want to perform a bulk load into a table with the following format:
   * // CREATE TABLE employees (first_name nvarchar(255), last_name nvarchar(255), day_of_birth date);
   *
   * const bulkLoad = connection.newBulkLoad('employees', (err, rowCount) => {
   *   // ...
   * });
   *
   * // First, we need to specify the columns that we want to write to,
   * // and their definitions. These definitions must match the actual table,
   * // otherwise the bulk load will fail.
   * bulkLoad.addColumn('first_name', TYPES.NVarchar, { nullable: false });
   * bulkLoad.addColumn('last_name', TYPES.NVarchar, { nullable: false });
   * bulkLoad.addColumn('date_of_birth', TYPES.Date, { nullable: false });
   *
   * // Execute a bulk load with a predefined list of rows.
   * //
   * // Note that these rows are held in memory until the
   * // bulk load was performed, so if you need to write a large
   * // number of rows (e.g. by reading from a CSV file),
   * // passing an `AsyncIterable` is advisable to keep memory usage low.
   * connection.execBulkLoad(bulkLoad, [
   *   { 'first_name': 'Steve', 'last_name': 'Jobs', 'day_of_birth': new Date('02-24-1955') },
   *   { 'first_name': 'Bill', 'last_name': 'Gates', 'day_of_birth': new Date('10-28-1955') }
   * ]);
   * ```
   *
   * @param bulkLoad A previously created [[BulkLoad]].
   * @param rows A [[Iterable]] or [[AsyncIterable]] that contains the rows that should be bulk loaded.
   */


  execBulkLoad(bulkLoad, rows) {
    bulkLoad.executionStarted = true;

    if (rows) {
      if (bulkLoad.streamingMode) {
        throw new Error("Connection.execBulkLoad can't be called with a BulkLoad that was put in streaming mode.");
      }

      if (bulkLoad.firstRowWritten) {
        throw new Error("Connection.execBulkLoad can't be called with a BulkLoad that already has rows written to it.");
      }

      const rowStream = _stream.Readable.from(rows); // Destroy the packet transform if an error happens in the row stream,
      // e.g. if an error is thrown from within a generator or stream.


      rowStream.on('error', err => {
        bulkLoad.rowToPacketTransform.destroy(err);
      }); // Destroy the row stream if an error happens in the packet transform,
      // e.g. if the bulk load is cancelled.

      bulkLoad.rowToPacketTransform.on('error', err => {
        rowStream.destroy(err);
      });
      rowStream.pipe(bulkLoad.rowToPacketTransform);
    } else if (!bulkLoad.streamingMode) {
      // If the bulkload was not put into streaming mode by the user,
      // we end the rowToPacketTransform here for them.
      //
      // If it was put into streaming mode, it's the user's responsibility
      // to end the stream.
      bulkLoad.rowToPacketTransform.end();
    }

    const onCancel = () => {
      request.cancel();
    };

    const payload = new _bulkLoadPayload.BulkLoadPayload(bulkLoad);
    const request = new _request.default(bulkLoad.getBulkInsertSql(), error => {
      bulkLoad.removeListener('cancel', onCancel);

      if (error) {
        if (error.code === 'UNKNOWN') {
          error.message += ' This is likely because the schema of the BulkLoad does not match the schema of the table you are attempting to insert into.';
        }

        bulkLoad.error = error;
        bulkLoad.callback(error);
        return;
      }

      this.makeRequest(bulkLoad, _packet.TYPE.BULK_LOAD, payload);
    });
    bulkLoad.once('cancel', onCancel);
    this.execSqlBatch(request);
  }
  /**
   * Prepare the SQL represented by the request.
   *
   * The request can then be used in subsequent calls to
   * [[execute]] and [[unprepare]]
   *
   * @param request A [[Request]] object representing the request.
   *   Parameters only require a name and type. Parameter values are ignored.
   */


  prepare(request) {
    const parameters = [];
    parameters.push({
      type: _dataType.TYPES.Int,
      name: 'handle',
      value: undefined,
      output: true,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    parameters.push({
      type: _dataType.TYPES.NVarChar,
      name: 'params',
      value: request.parameters.length ? request.makeParamsParameter(request.parameters) : null,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    parameters.push({
      type: _dataType.TYPES.NVarChar,
      name: 'stmt',
      value: request.sqlTextOrProcedure,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    request.preparing = true; // TODO: We need to clean up this event handler, otherwise this leaks memory

    request.on('returnValue', (name, value) => {
      if (name === 'handle') {
        request.handle = value;
      } else {
        request.error = new _errors.RequestError(`Tedious > Unexpected output parameter ${name} from sp_prepare`);
      }
    });
    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default('sp_prepare', parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Release the SQL Server resources associated with a previously prepared request.
   *
   * @param request A [[Request]] object representing the request.
   *   Parameters only require a name and type.
   *   Parameter values are ignored.
   */


  unprepare(request) {
    const parameters = [];
    parameters.push({
      type: _dataType.TYPES.Int,
      name: 'handle',
      // TODO: Abort if `request.handle` is not set
      value: request.handle,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default('sp_unprepare', parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Execute previously prepared SQL, using the supplied parameters.
   *
   * @param request A previously prepared [[Request]].
   * @param parameters  An object whose names correspond to the names of
   *   parameters that were added to the [[Request]] before it was prepared.
   *   The object's values are passed as the parameters' values when the
   *   request is executed.
   */


  execute(request, parameters) {
    const executeParameters = [];
    executeParameters.push({
      type: _dataType.TYPES.Int,
      name: 'handle',
      // TODO: Abort if `request.handle` is not set
      value: request.handle,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });

    try {
      for (let i = 0, len = request.parameters.length; i < len; i++) {
        const parameter = request.parameters[i];
        executeParameters.push({ ...parameter,
          value: parameter.type.validate(parameters ? parameters[parameter.name] : null, this.databaseCollation)
        });
      }
    } catch (error) {
      request.error = error;
      process.nextTick(() => {
        this.debug.log(error.message);
        request.callback(error);
      });
      return;
    }

    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default('sp_execute', executeParameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Call a stored procedure represented by [[Request]].
   *
   * @param request A [[Request]] object representing the request.
   */


  callProcedure(request) {
    try {
      request.validateParameters(this.databaseCollation);
    } catch (error) {
      request.error = error;
      process.nextTick(() => {
        this.debug.log(error.message);
        request.callback(error);
      });
      return;
    }

    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(request.sqlTextOrProcedure, request.parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Start a transaction.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.
   *   Optional, and defaults to an empty string. Required when `isolationLevel`
   *   is present.
   * @param isolationLevel The isolation level that the transaction is to be run with.
   *
   *   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
   *   * `READ_UNCOMMITTED`
   *   * `READ_COMMITTED`
   *   * `REPEATABLE_READ`
   *   * `SERIALIZABLE`
   *   * `SNAPSHOT`
   *
   *   Optional, and defaults to the Connection's isolation level.
   */


  beginTransaction(callback, name = '', isolationLevel = this.config.options.isolationLevel) {
    (0, _transaction.assertValidIsolationLevel)(isolationLevel, 'isolationLevel');
    const transaction = new _transaction.Transaction(name, isolationLevel);

    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('SET TRANSACTION ISOLATION LEVEL ' + transaction.isolationLevelToTSQL() + ';BEGIN TRAN ' + transaction.name, err => {
        this.transactionDepth++;

        if (this.transactionDepth === 1) {
          this.inTransaction = true;
        }

        callback(err);
      }));
    }

    const request = new _request.default(undefined, err => {
      return callback(err, this.currentTransactionDescriptor());
    });
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.beginPayload(this.currentTransactionDescriptor()));
  }
  /**
   * Commit a transaction.
   *
   * There should be an active transaction - that is, [[beginTransaction]]
   * should have been previously called.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.
   *   Optional, and defaults to an empty string. Required when `isolationLevel`is present.
   */


  commitTransaction(callback, name = '') {
    const transaction = new _transaction.Transaction(name);

    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('COMMIT TRAN ' + transaction.name, err => {
        this.transactionDepth--;

        if (this.transactionDepth === 0) {
          this.inTransaction = false;
        }

        callback(err);
      }));
    }

    const request = new _request.default(undefined, callback);
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.commitPayload(this.currentTransactionDescriptor()));
  }
  /**
   * Rollback a transaction.
   *
   * There should be an active transaction - that is, [[beginTransaction]]
   * should have been previously called.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.
   *   Optional, and defaults to an empty string.
   *   Required when `isolationLevel` is present.
   */


  rollbackTransaction(callback, name = '') {
    const transaction = new _transaction.Transaction(name);

    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('ROLLBACK TRAN ' + transaction.name, err => {
        this.transactionDepth--;

        if (this.transactionDepth === 0) {
          this.inTransaction = false;
        }

        callback(err);
      }));
    }

    const request = new _request.default(undefined, callback);
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.rollbackPayload(this.currentTransactionDescriptor()));
  }
  /**
   * Set a savepoint within a transaction.
   *
   * There should be an active transaction - that is, [[beginTransaction]]
   * should have been previously called.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.\
   *   Optional, and defaults to an empty string.
   *   Required when `isolationLevel` is present.
   */


  saveTransaction(callback, name) {
    const transaction = new _transaction.Transaction(name);

    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('SAVE TRAN ' + transaction.name, err => {
        this.transactionDepth++;
        callback(err);
      }));
    }

    const request = new _request.default(undefined, callback);
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.savePayload(this.currentTransactionDescriptor()));
  }
  /**
   * Run the given callback after starting a transaction, and commit or
   * rollback the transaction afterwards.
   *
   * This is a helper that employs [[beginTransaction]], [[commitTransaction]],
   * [[rollbackTransaction]], and [[saveTransaction]] to greatly simplify the
   * use of database transactions and automatically handle transaction nesting.
   *
   * @param cb
   * @param isolationLevel
   *   The isolation level that the transaction is to be run with.
   *
   *   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
   *   * `READ_UNCOMMITTED`
   *   * `READ_COMMITTED`
   *   * `REPEATABLE_READ`
   *   * `SERIALIZABLE`
   *   * `SNAPSHOT`
   *
   *   Optional, and defaults to the Connection's isolation level.
   */


  transaction(cb, isolationLevel) {
    if (typeof cb !== 'function') {
      throw new TypeError('`cb` must be a function');
    }

    const useSavepoint = this.inTransaction;

    const name = '_tedious_' + _crypto.default.randomBytes(10).toString('hex');

    const txDone = (err, done, ...args) => {
      if (err) {
        if (this.inTransaction && this.state === this.STATE.LOGGED_IN) {
          this.rollbackTransaction(txErr => {
            done(txErr || err, ...args);
          }, name);
        } else {
          done(err, ...args);
        }
      } else if (useSavepoint) {
        if (this.config.options.tdsVersion < '7_2') {
          this.transactionDepth--;
        }

        done(null, ...args);
      } else {
        this.commitTransaction(txErr => {
          done(txErr, ...args);
        }, name);
      }
    };

    if (useSavepoint) {
      return this.saveTransaction(err => {
        if (err) {
          return cb(err);
        }

        if (isolationLevel) {
          return this.execSqlBatch(new _request.default('SET transaction isolation level ' + this.getIsolationLevelText(isolationLevel), err => {
            return cb(err, txDone);
          }));
        } else {
          return cb(null, txDone);
        }
      }, name);
    } else {
      return this.beginTransaction(err => {
        if (err) {
          return cb(err);
        }

        return cb(null, txDone);
      }, name, isolationLevel);
    }
  }
  /**
   * @private
   */


  makeRequest(request, packetType, payload) {
    if (this.state !== this.STATE.LOGGED_IN) {
      const message = 'Requests can only be made in the ' + this.STATE.LOGGED_IN.name + ' state, not the ' + this.state.name + ' state';
      this.debug.log(message);
      request.callback(new _errors.RequestError(message, 'EINVALIDSTATE'));
    } else if (request.canceled) {
      process.nextTick(() => {
        request.callback(new _errors.RequestError('Canceled.', 'ECANCEL'));
      });
    } else {
      if (packetType === _packet.TYPE.SQL_BATCH) {
        this.isSqlBatch = true;
      } else {
        this.isSqlBatch = false;
      }

      this.request = request;
      request.connection = this;
      request.rowCount = 0;
      request.rows = [];
      request.rst = [];

      const onCancel = () => {
        payloadStream.unpipe(message);
        payloadStream.destroy(new _errors.RequestError('Canceled.', 'ECANCEL')); // set the ignore bit and end the message.

        message.ignore = true;
        message.end();

        if (request instanceof _request.default && request.paused) {
          // resume the request if it was paused so we can read the remaining tokens
          request.resume();
        }
      };

      request.once('cancel', onCancel);
      this.createRequestTimer();
      const message = new _message.default({
        type: packetType,
        resetConnection: this.resetConnectionOnNextRequest
      });
      this.messageIo.outgoingMessageStream.write(message);
      this.transitionTo(this.STATE.SENT_CLIENT_REQUEST);
      message.once('finish', () => {
        request.removeListener('cancel', onCancel);
        request.once('cancel', this._cancelAfterRequestSent);
        this.resetConnectionOnNextRequest = false;
        this.debug.payload(function () {
          return payload.toString('  ');
        });
      });

      const payloadStream = _stream.Readable.from(payload);

      payloadStream.once('error', error => {
        payloadStream.unpipe(message); // Only set a request error if no error was set yet.

        request.error ?? (request.error = error);
        message.ignore = true;
        message.end();
      });
      payloadStream.pipe(message);
    }
  }
  /**
   * Cancel currently executed request.
   */


  cancel() {
    if (!this.request) {
      return false;
    }

    if (this.request.canceled) {
      return false;
    }

    this.request.cancel();
    return true;
  }
  /**
   * Reset the connection to its initial state.
   * Can be useful for connection pool implementations.
   *
   * @param callback
   */


  reset(callback) {
    const request = new _request.default(this.getInitialSql(), err => {
      if (this.config.options.tdsVersion < '7_2') {
        this.inTransaction = false;
      }

      callback(err);
    });
    this.resetConnectionOnNextRequest = true;
    this.execSqlBatch(request);
  }
  /**
   * @private
   */


  currentTransactionDescriptor() {
    return this.transactionDescriptors[this.transactionDescriptors.length - 1];
  }
  /**
   * @private
   */


  getIsolationLevelText(isolationLevel) {
    switch (isolationLevel) {
      case _transaction.ISOLATION_LEVEL.READ_UNCOMMITTED:
        return 'read uncommitted';

      case _transaction.ISOLATION_LEVEL.REPEATABLE_READ:
        return 'repeatable read';

      case _transaction.ISOLATION_LEVEL.SERIALIZABLE:
        return 'serializable';

      case _transaction.ISOLATION_LEVEL.SNAPSHOT:
        return 'snapshot';

      default:
        return 'read committed';
    }
  }

}

function isTransientError(error) {
  if (error instanceof _esAggregateError.default) {
    error = error.errors[0];
  }

  return error instanceof _errors.ConnectionError && !!error.isTransient;
}

var _default = Connection;
exports.default = _default;
module.exports = Connection;
Connection.prototype.STATE = {
  INITIALIZED: {
    name: 'Initialized',
    events: {}
  },
  CONNECTING: {
    name: 'Connecting',
    enter: function () {
      this.initialiseConnection();
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_PRELOGIN: {
    name: 'SentPrelogin',
    enter: function () {
      (async () => {
        let messageBuffer = Buffer.alloc(0);
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        for await (const data of message) {
          messageBuffer = Buffer.concat([messageBuffer, data]);
        }

        const preloginPayload = new _preloginPayload.default(messageBuffer);
        this.debug.payload(function () {
          return preloginPayload.toString('  ');
        });

        if (preloginPayload.fedAuthRequired === 1) {
          this.fedAuthRequired = true;
        }

        if (preloginPayload.encryptionString === 'ON' || preloginPayload.encryptionString === 'REQ') {
          if (!this.config.options.encrypt) {
            this.emit('connect', new _errors.ConnectionError("Server requires encryption, set 'encrypt' config option to true.", 'EENCRYPT'));
            return this.close();
          }

          try {
            var _this$routingData;

            this.transitionTo(this.STATE.SENT_TLSSSLNEGOTIATION);
            await this.messageIo.startTls(this.secureContextOptions, ((_this$routingData = this.routingData) === null || _this$routingData === void 0 ? void 0 : _this$routingData.server) ?? this.config.server, this.config.options.trustServerCertificate);
          } catch (err) {
            return this.socketError(err);
          }
        }

        this.sendLogin7Packet();
        const {
          authentication
        } = this.config;

        switch (authentication.type) {
          case 'azure-active-directory-password':
          case 'azure-active-directory-msi-vm':
          case 'azure-active-directory-msi-app-service':
          case 'azure-active-directory-service-principal-secret':
          case 'azure-active-directory-default':
            this.transitionTo(this.STATE.SENT_LOGIN7_WITH_FEDAUTH);
            break;

          case 'ntlm':
            this.transitionTo(this.STATE.SENT_LOGIN7_WITH_NTLM);
            break;

          default:
            this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
            break;
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  REROUTING: {
    name: 'ReRouting',
    enter: function () {
      this.cleanupConnection(CLEANUP_TYPE.REDIRECT);
    },
    events: {
      message: function () {},
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      reconnect: function () {
        this.transitionTo(this.STATE.CONNECTING);
      }
    }
  },
  TRANSIENT_FAILURE_RETRY: {
    name: 'TRANSIENT_FAILURE_RETRY',
    enter: function () {
      this.curTransientRetryCount++;
      this.cleanupConnection(CLEANUP_TYPE.RETRY);
    },
    events: {
      message: function () {},
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      retry: function () {
        this.createRetryTimer();
      }
    }
  },
  SENT_TLSSSLNEGOTIATION: {
    name: 'SentTLSSSLNegotiation',
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_LOGIN7_WITH_STANDARD_LOGIN: {
    name: 'SentLogin7WithStandardLogin',
    enter: function () {
      (async () => {
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        const handler = new _handler.Login7TokenHandler(this);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await (0, _events.once)(tokenStreamParser, 'end');

        if (handler.loginAckReceived) {
          if (handler.routingData) {
            this.routingData = handler.routingData;
            this.transitionTo(this.STATE.REROUTING);
          } else {
            this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
          }
        } else if (this.loginError) {
          if (isTransientError(this.loginError)) {
            this.debug.log('Initiating retry on transient error');
            this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
          } else {
            this.emit('connect', this.loginError);
            this.transitionTo(this.STATE.FINAL);
          }
        } else {
          this.emit('connect', new _errors.ConnectionError('Login failed.', 'ELOGIN'));
          this.transitionTo(this.STATE.FINAL);
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_LOGIN7_WITH_NTLM: {
    name: 'SentLogin7WithNTLMLogin',
    enter: function () {
      (async () => {
        while (true) {
          let message;

          try {
            message = await this.messageIo.readMessage();
          } catch (err) {
            return this.socketError(err);
          }

          const handler = new _handler.Login7TokenHandler(this);
          const tokenStreamParser = this.createTokenStreamParser(message, handler);
          await (0, _events.once)(tokenStreamParser, 'end');

          if (handler.loginAckReceived) {
            if (handler.routingData) {
              this.routingData = handler.routingData;
              return this.transitionTo(this.STATE.REROUTING);
            } else {
              return this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
            }
          } else if (this.ntlmpacket) {
            const authentication = this.config.authentication;
            const payload = new _ntlmPayload.default({
              domain: authentication.options.domain,
              userName: authentication.options.userName,
              password: authentication.options.password,
              ntlmpacket: this.ntlmpacket
            });
            this.messageIo.sendMessage(_packet.TYPE.NTLMAUTH_PKT, payload.data);
            this.debug.payload(function () {
              return payload.toString('  ');
            });
            this.ntlmpacket = undefined;
          } else if (this.loginError) {
            if (isTransientError(this.loginError)) {
              this.debug.log('Initiating retry on transient error');
              return this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
            } else {
              this.emit('connect', this.loginError);
              return this.transitionTo(this.STATE.FINAL);
            }
          } else {
            this.emit('connect', new _errors.ConnectionError('Login failed.', 'ELOGIN'));
            return this.transitionTo(this.STATE.FINAL);
          }
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_LOGIN7_WITH_FEDAUTH: {
    name: 'SentLogin7Withfedauth',
    enter: function () {
      (async () => {
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        const handler = new _handler.Login7TokenHandler(this);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await (0, _events.once)(tokenStreamParser, 'end');

        if (handler.loginAckReceived) {
          if (handler.routingData) {
            this.routingData = handler.routingData;
            this.transitionTo(this.STATE.REROUTING);
          } else {
            this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
          }

          return;
        }

        const fedAuthInfoToken = handler.fedAuthInfoToken;

        if (fedAuthInfoToken && fedAuthInfoToken.stsurl && fedAuthInfoToken.spn) {
          const authentication = this.config.authentication;
          const tokenScope = new _url.URL('/.default', fedAuthInfoToken.spn).toString();
          let credentials;

          switch (authentication.type) {
            case 'azure-active-directory-password':
              break;

            case 'azure-active-directory-msi-vm':
              break;

            case 'azure-active-directory-msi-app-service':
              break;

            case 'azure-active-directory-default':
              break;

            case 'azure-active-directory-service-principal-secret':
              break;
          }

          let tokenResponse;

          try {
            tokenResponse = await credentials.getToken(tokenScope);
          } catch (err) {
            this.loginError = new _esAggregateError.default([new _errors.ConnectionError('Security token could not be authenticated or authorized.', 'EFEDAUTH'), err]);
            this.emit('connect', this.loginError);
            this.transitionTo(this.STATE.FINAL);
            return;
          }

          const token = tokenResponse.token;
          this.sendFedAuthTokenMessage(token);
        } else if (this.loginError) {
          if (isTransientError(this.loginError)) {
            this.debug.log('Initiating retry on transient error');
            this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
          } else {
            this.emit('connect', this.loginError);
            this.transitionTo(this.STATE.FINAL);
          }
        } else {
          this.emit('connect', new _errors.ConnectionError('Login failed.', 'ELOGIN'));
          this.transitionTo(this.STATE.FINAL);
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  LOGGED_IN_SENDING_INITIAL_SQL: {
    name: 'LoggedInSendingInitialSql',
    enter: function () {
      (async () => {
        this.sendInitialSql();
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        const tokenStreamParser = this.createTokenStreamParser(message, new _handler.InitialSqlTokenHandler(this));
        await (0, _events.once)(tokenStreamParser, 'end');
        this.transitionTo(this.STATE.LOGGED_IN);
        this.processedInitialSql();
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function socketError() {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  LOGGED_IN: {
    name: 'LoggedIn',
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_CLIENT_REQUEST: {
    name: 'SentClientRequest',
    enter: function () {
      (async () => {
        var _this$request, _this$request3, _this$request10;

        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        } // request timer is stopped on first data package


        this.clearRequestTimer();
        const tokenStreamParser = this.createTokenStreamParser(message, new _handler.RequestTokenHandler(this, this.request)); // If the request was canceled and we have a `cancelTimer`
        // defined, we send a attention message after the
        // request message was fully sent off.
        //
        // We already started consuming the current message
        // (but all the token handlers should be no-ops), and
        // need to ensure the next message is handled by the
        // `SENT_ATTENTION` state.

        if ((_this$request = this.request) !== null && _this$request !== void 0 && _this$request.canceled && this.cancelTimer) {
          return this.transitionTo(this.STATE.SENT_ATTENTION);
        }

        const onResume = () => {
          tokenStreamParser.resume();
        };

        const onPause = () => {
          var _this$request2;

          tokenStreamParser.pause();
          (_this$request2 = this.request) === null || _this$request2 === void 0 ? void 0 : _this$request2.once('resume', onResume);
        };

        (_this$request3 = this.request) === null || _this$request3 === void 0 ? void 0 : _this$request3.on('pause', onPause);

        if (this.request instanceof _request.default && this.request.paused) {
          onPause();
        }

        const onCancel = () => {
          var _this$request4, _this$request5;

          tokenStreamParser.removeListener('end', onEndOfMessage);

          if (this.request instanceof _request.default && this.request.paused) {
            // resume the request if it was paused so we can read the remaining tokens
            this.request.resume();
          }

          (_this$request4 = this.request) === null || _this$request4 === void 0 ? void 0 : _this$request4.removeListener('pause', onPause);
          (_this$request5 = this.request) === null || _this$request5 === void 0 ? void 0 : _this$request5.removeListener('resume', onResume); // The `_cancelAfterRequestSent` callback will have sent a
          // attention message, so now we need to also switch to
          // the `SENT_ATTENTION` state to make sure the attention ack
          // message is processed correctly.

          this.transitionTo(this.STATE.SENT_ATTENTION);
        };

        const onEndOfMessage = () => {
          var _this$request6, _this$request7, _this$request8, _this$request9;

          (_this$request6 = this.request) === null || _this$request6 === void 0 ? void 0 : _this$request6.removeListener('cancel', this._cancelAfterRequestSent);
          (_this$request7 = this.request) === null || _this$request7 === void 0 ? void 0 : _this$request7.removeListener('cancel', onCancel);
          (_this$request8 = this.request) === null || _this$request8 === void 0 ? void 0 : _this$request8.removeListener('pause', onPause);
          (_this$request9 = this.request) === null || _this$request9 === void 0 ? void 0 : _this$request9.removeListener('resume', onResume);
          this.transitionTo(this.STATE.LOGGED_IN);
          const sqlRequest = this.request;
          this.request = undefined;

          if (this.config.options.tdsVersion < '7_2' && sqlRequest.error && this.isSqlBatch) {
            this.inTransaction = false;
          }

          sqlRequest.callback(sqlRequest.error, sqlRequest.rowCount, sqlRequest.rows);
        };

        tokenStreamParser.once('end', onEndOfMessage);
        (_this$request10 = this.request) === null || _this$request10 === void 0 ? void 0 : _this$request10.once('cancel', onCancel);
      })();
    },
    exit: function (nextState) {
      this.clearRequestTimer();
    },
    events: {
      socketError: function (err) {
        const sqlRequest = this.request;
        this.request = undefined;
        this.transitionTo(this.STATE.FINAL);
        sqlRequest.callback(err);
      }
    }
  },
  SENT_ATTENTION: {
    name: 'SentAttention',
    enter: function () {
      (async () => {
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        const handler = new _handler.AttentionTokenHandler(this, this.request);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await (0, _events.once)(tokenStreamParser, 'end'); // 3.2.5.7 Sent Attention State
        // Discard any data contained in the response, until we receive the attention response

        if (handler.attentionReceived) {
          this.clearCancelTimer();
          const sqlRequest = this.request;
          this.request = undefined;
          this.transitionTo(this.STATE.LOGGED_IN);

          if (sqlRequest.error && sqlRequest.error instanceof _errors.RequestError && sqlRequest.error.code === 'ETIMEOUT') {
            sqlRequest.callback(sqlRequest.error);
          } else {
            sqlRequest.callback(new _errors.RequestError('Canceled.', 'ECANCEL'));
          }
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function (err) {
        const sqlRequest = this.request;
        this.request = undefined;
        this.transitionTo(this.STATE.FINAL);
        sqlRequest.callback(err);
      }
    }
  },
  FINAL: {
    name: 'Final',
    enter: function () {
      this.cleanupConnection(CLEANUP_TYPE.NORMAL);
    },
    events: {
      connectTimeout: function () {// Do nothing, as the timer should be cleaned up.
      },
      message: function () {// Do nothing
      },
      socketError: function () {// Do nothing
      }
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJLRUVQX0FMSVZFX0lOSVRJQUxfREVMQVkiLCJERUZBVUxUX0NPTk5FQ1RfVElNRU9VVCIsIkRFRkFVTFRfQ0xJRU5UX1JFUVVFU1RfVElNRU9VVCIsIkRFRkFVTFRfQ0FOQ0VMX1RJTUVPVVQiLCJERUZBVUxUX0NPTk5FQ1RfUkVUUllfSU5URVJWQUwiLCJERUZBVUxUX1BBQ0tFVF9TSVpFIiwiREVGQVVMVF9URVhUU0laRSIsIkRFRkFVTFRfREFURUZJUlNUIiwiREVGQVVMVF9QT1JUIiwiREVGQVVMVF9URFNfVkVSU0lPTiIsIkRFRkFVTFRfTEFOR1VBR0UiLCJERUZBVUxUX0RBVEVGT1JNQVQiLCJDTEVBTlVQX1RZUEUiLCJOT1JNQUwiLCJSRURJUkVDVCIsIlJFVFJZIiwiQ29ubmVjdGlvbiIsIkV2ZW50RW1pdHRlciIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwiZmVkQXV0aFJlcXVpcmVkIiwic2VjdXJlQ29udGV4dE9wdGlvbnMiLCJpblRyYW5zYWN0aW9uIiwidHJhbnNhY3Rpb25EZXNjcmlwdG9ycyIsInRyYW5zYWN0aW9uRGVwdGgiLCJpc1NxbEJhdGNoIiwiY3VyVHJhbnNpZW50UmV0cnlDb3VudCIsInRyYW5zaWVudEVycm9yTG9va3VwIiwiY2xvc2VkIiwibG9naW5FcnJvciIsImRlYnVnIiwibnRsbXBhY2tldCIsIm50bG1wYWNrZXRCdWZmZXIiLCJyb3V0aW5nRGF0YSIsIm1lc3NhZ2VJbyIsInN0YXRlIiwicmVzZXRDb25uZWN0aW9uT25OZXh0UmVxdWVzdCIsInJlcXVlc3QiLCJwcm9jUmV0dXJuU3RhdHVzVmFsdWUiLCJzb2NrZXQiLCJtZXNzYWdlQnVmZmVyIiwiY29ubmVjdFRpbWVyIiwiY2FuY2VsVGltZXIiLCJyZXF1ZXN0VGltZXIiLCJyZXRyeVRpbWVyIiwiX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnQiLCJkYXRhYmFzZUNvbGxhdGlvbiIsIlR5cGVFcnJvciIsInNlcnZlciIsImF1dGhlbnRpY2F0aW9uIiwidW5kZWZpbmVkIiwidHlwZSIsIm9wdGlvbnMiLCJkb21haW4iLCJ1c2VyTmFtZSIsInBhc3N3b3JkIiwidG9VcHBlckNhc2UiLCJjbGllbnRJZCIsInRlbmFudElkIiwidG9rZW4iLCJjbGllbnRTZWNyZXQiLCJhYm9ydFRyYW5zYWN0aW9uT25FcnJvciIsImFwcE5hbWUiLCJjYW1lbENhc2VDb2x1bW5zIiwiY2FuY2VsVGltZW91dCIsImNvbHVtbkVuY3J5cHRpb25LZXlDYWNoZVRUTCIsImNvbHVtbkVuY3J5cHRpb25TZXR0aW5nIiwiY29sdW1uTmFtZVJlcGxhY2VyIiwiY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwiLCJjb25uZWN0VGltZW91dCIsImNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCIsIklTT0xBVElPTl9MRVZFTCIsIlJFQURfQ09NTUlUVEVEIiwiY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzIiwiZGF0YWJhc2UiLCJkYXRlZmlyc3QiLCJkYXRlRm9ybWF0IiwiZGF0YSIsInBhY2tldCIsInBheWxvYWQiLCJlbmFibGVBbnNpTnVsbCIsImVuYWJsZUFuc2lOdWxsRGVmYXVsdCIsImVuYWJsZUFuc2lQYWRkaW5nIiwiZW5hYmxlQW5zaVdhcm5pbmdzIiwiZW5hYmxlQXJpdGhBYm9ydCIsImVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsIiwiZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdCIsImVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zIiwiZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQiLCJlbmFibGVRdW90ZWRJZGVudGlmaWVyIiwiZW5jcnlwdCIsImZhbGxiYWNrVG9EZWZhdWx0RGIiLCJlbmNyeXB0aW9uS2V5U3RvcmVQcm92aWRlcnMiLCJpbnN0YW5jZU5hbWUiLCJpc29sYXRpb25MZXZlbCIsImxhbmd1YWdlIiwibG9jYWxBZGRyZXNzIiwibWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzIiwibXVsdGlTdWJuZXRGYWlsb3ZlciIsInBhY2tldFNpemUiLCJwb3J0IiwicmVhZE9ubHlJbnRlbnQiLCJyZXF1ZXN0VGltZW91dCIsInJvd0NvbGxlY3Rpb25PbkRvbmUiLCJyb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbiIsInNlcnZlck5hbWUiLCJzZXJ2ZXJTdXBwb3J0c0NvbHVtbkVuY3J5cHRpb24iLCJ0ZHNWZXJzaW9uIiwidGV4dHNpemUiLCJ0cnVzdGVkU2VydmVyTmFtZUFFIiwidHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZSIsInVzZUNvbHVtbk5hbWVzIiwidXNlVVRDIiwid29ya3N0YXRpb25JZCIsImxvd2VyQ2FzZUd1aWRzIiwiRXJyb3IiLCJSYW5nZUVycm9yIiwic2VjdXJlT3B0aW9ucyIsIk9iamVjdCIsImNyZWF0ZSIsInZhbHVlIiwiY29uc3RhbnRzIiwiU1NMX09QX0RPTlRfSU5TRVJUX0VNUFRZX0ZSQUdNRU5UUyIsImNyZWF0ZURlYnVnIiwiQnVmZmVyIiwiZnJvbSIsImFsbG9jIiwiVHJhbnNpZW50RXJyb3JMb29rdXAiLCJTVEFURSIsIklOSVRJQUxJWkVEIiwic2VuZE1lc3NhZ2UiLCJUWVBFIiwiQVRURU5USU9OIiwiY3JlYXRlQ2FuY2VsVGltZXIiLCJjb25uZWN0IiwiY29ubmVjdExpc3RlbmVyIiwiQ29ubmVjdGlvbkVycm9yIiwibmFtZSIsIm9uQ29ubmVjdCIsImVyciIsInJlbW92ZUxpc3RlbmVyIiwib25FcnJvciIsIm9uY2UiLCJ0cmFuc2l0aW9uVG8iLCJDT05ORUNUSU5HIiwib24iLCJldmVudCIsImxpc3RlbmVyIiwiZW1pdCIsImFyZ3MiLCJjbG9zZSIsIkZJTkFMIiwiaW5pdGlhbGlzZUNvbm5lY3Rpb24iLCJzaWduYWwiLCJjcmVhdGVDb25uZWN0VGltZXIiLCJjb25uZWN0T25Qb3J0IiwidGltZW91dCIsInRoZW4iLCJwcm9jZXNzIiwibmV4dFRpY2siLCJjbGVhckNvbm5lY3RUaW1lciIsIm1lc3NhZ2UiLCJjbGVhbnVwQ29ubmVjdGlvbiIsImNsZWFudXBUeXBlIiwiY2xlYXJSZXF1ZXN0VGltZXIiLCJjbGVhclJldHJ5VGltZXIiLCJjbG9zZUNvbm5lY3Rpb24iLCJSZXF1ZXN0RXJyb3IiLCJjYWxsYmFjayIsIkRlYnVnIiwiY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIiLCJoYW5kbGVyIiwiVG9rZW5TdHJlYW1QYXJzZXIiLCJjb25uZWN0T3B0cyIsImhvc3QiLCJjb25uZWN0SW5QYXJhbGxlbCIsImNvbm5lY3RJblNlcXVlbmNlIiwiZG5zIiwibG9va3VwIiwiZXJyb3IiLCJzb2NrZXRFcnJvciIsInNvY2tldENsb3NlIiwic29ja2V0RW5kIiwic2V0S2VlcEFsaXZlIiwiTWVzc2FnZUlPIiwiY2xlYXJ0ZXh0IiwibG9nIiwic2VuZFByZUxvZ2luIiwiU0VOVF9QUkVMT0dJTiIsImRlc3Ryb3kiLCJjb250cm9sbGVyIiwiQWJvcnRDb250cm9sbGVyIiwic2V0VGltZW91dCIsImFib3J0IiwiY2xlYXJDYW5jZWxUaW1lciIsImNyZWF0ZVJlcXVlc3RUaW1lciIsImNyZWF0ZVJldHJ5VGltZXIiLCJyZXRyeVRpbWVvdXQiLCJkaXNwYXRjaEV2ZW50IiwiY2FuY2VsIiwiY2xlYXJUaW1lb3V0IiwibmV3U3RhdGUiLCJleGl0IiwiY2FsbCIsImVudGVyIiwiYXBwbHkiLCJnZXRFdmVudEhhbmRsZXIiLCJldmVudE5hbWUiLCJldmVudHMiLCJTRU5UX1RMU1NTTE5FR09USUFUSU9OIiwiY29kZSIsIlJFUk9VVElORyIsIlRSQU5TSUVOVF9GQUlMVVJFX1JFVFJZIiwibWFqb3IiLCJtaW5vciIsImJ1aWxkIiwiZXhlYyIsInZlcnNpb24iLCJQcmVsb2dpblBheWxvYWQiLCJOdW1iZXIiLCJzdWJidWlsZCIsIlBSRUxPR0lOIiwidG9TdHJpbmciLCJzZW5kTG9naW43UGFja2V0IiwiTG9naW43UGF5bG9hZCIsInZlcnNpb25zIiwiY2xpZW50UHJvZ1ZlciIsImNsaWVudFBpZCIsInBpZCIsImNvbm5lY3Rpb25JZCIsImNsaWVudFRpbWVab25lIiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwiY2xpZW50TGNpZCIsImZlZEF1dGgiLCJlY2hvIiwid29ya2Zsb3ciLCJmZWRBdXRoVG9rZW4iLCJzc3BpIiwiaG9zdG5hbWUiLCJvcyIsImxpYnJhcnlOYW1lIiwiaW5pdERiRmF0YWwiLCJMT0dJTjciLCJ0b0J1ZmZlciIsInNlbmRGZWRBdXRoVG9rZW5NZXNzYWdlIiwiYWNjZXNzVG9rZW5MZW4iLCJieXRlTGVuZ3RoIiwib2Zmc2V0Iiwid3JpdGVVSW50MzJMRSIsIndyaXRlIiwiRkVEQVVUSF9UT0tFTiIsIlNFTlRfTE9HSU43X1dJVEhfU1RBTkRBUkRfTE9HSU4iLCJzZW5kSW5pdGlhbFNxbCIsIlNxbEJhdGNoUGF5bG9hZCIsImdldEluaXRpYWxTcWwiLCJjdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yIiwiTWVzc2FnZSIsIlNRTF9CQVRDSCIsIm91dGdvaW5nTWVzc2FnZVN0cmVhbSIsIlJlYWRhYmxlIiwicGlwZSIsInB1c2giLCJnZXRJc29sYXRpb25MZXZlbFRleHQiLCJqb2luIiwicHJvY2Vzc2VkSW5pdGlhbFNxbCIsImV4ZWNTcWxCYXRjaCIsIm1ha2VSZXF1ZXN0Iiwic3FsVGV4dE9yUHJvY2VkdXJlIiwiZXhlY1NxbCIsInZhbGlkYXRlUGFyYW1ldGVycyIsInBhcmFtZXRlcnMiLCJUWVBFUyIsIk5WYXJDaGFyIiwib3V0cHV0IiwibGVuZ3RoIiwicHJlY2lzaW9uIiwic2NhbGUiLCJtYWtlUGFyYW1zUGFyYW1ldGVyIiwiUlBDX1JFUVVFU1QiLCJScGNSZXF1ZXN0UGF5bG9hZCIsIm5ld0J1bGtMb2FkIiwidGFibGUiLCJjYWxsYmFja09yT3B0aW9ucyIsIkJ1bGtMb2FkIiwiZXhlY0J1bGtMb2FkIiwiYnVsa0xvYWQiLCJyb3dzIiwiZXhlY3V0aW9uU3RhcnRlZCIsInN0cmVhbWluZ01vZGUiLCJmaXJzdFJvd1dyaXR0ZW4iLCJyb3dTdHJlYW0iLCJyb3dUb1BhY2tldFRyYW5zZm9ybSIsImVuZCIsIm9uQ2FuY2VsIiwiQnVsa0xvYWRQYXlsb2FkIiwiUmVxdWVzdCIsImdldEJ1bGtJbnNlcnRTcWwiLCJCVUxLX0xPQUQiLCJwcmVwYXJlIiwiSW50IiwicHJlcGFyaW5nIiwiaGFuZGxlIiwidW5wcmVwYXJlIiwiZXhlY3V0ZSIsImV4ZWN1dGVQYXJhbWV0ZXJzIiwiaSIsImxlbiIsInBhcmFtZXRlciIsInZhbGlkYXRlIiwiY2FsbFByb2NlZHVyZSIsImJlZ2luVHJhbnNhY3Rpb24iLCJ0cmFuc2FjdGlvbiIsIlRyYW5zYWN0aW9uIiwiaXNvbGF0aW9uTGV2ZWxUb1RTUUwiLCJUUkFOU0FDVElPTl9NQU5BR0VSIiwiYmVnaW5QYXlsb2FkIiwiY29tbWl0VHJhbnNhY3Rpb24iLCJjb21taXRQYXlsb2FkIiwicm9sbGJhY2tUcmFuc2FjdGlvbiIsInJvbGxiYWNrUGF5bG9hZCIsInNhdmVUcmFuc2FjdGlvbiIsInNhdmVQYXlsb2FkIiwiY2IiLCJ1c2VTYXZlcG9pbnQiLCJjcnlwdG8iLCJyYW5kb21CeXRlcyIsInR4RG9uZSIsImRvbmUiLCJMT0dHRURfSU4iLCJ0eEVyciIsInBhY2tldFR5cGUiLCJjYW5jZWxlZCIsImNvbm5lY3Rpb24iLCJyb3dDb3VudCIsInJzdCIsInBheWxvYWRTdHJlYW0iLCJ1bnBpcGUiLCJpZ25vcmUiLCJwYXVzZWQiLCJyZXN1bWUiLCJyZXNldENvbm5lY3Rpb24iLCJTRU5UX0NMSUVOVF9SRVFVRVNUIiwicmVzZXQiLCJSRUFEX1VOQ09NTUlUVEVEIiwiUkVQRUFUQUJMRV9SRUFEIiwiU0VSSUFMSVpBQkxFIiwiU05BUFNIT1QiLCJpc1RyYW5zaWVudEVycm9yIiwiQWdncmVnYXRlRXJyb3IiLCJlcnJvcnMiLCJpc1RyYW5zaWVudCIsIm1vZHVsZSIsImV4cG9ydHMiLCJwcm90b3R5cGUiLCJyZWFkTWVzc2FnZSIsImNvbmNhdCIsInByZWxvZ2luUGF5bG9hZCIsImVuY3J5cHRpb25TdHJpbmciLCJzdGFydFRscyIsIlNFTlRfTE9HSU43X1dJVEhfRkVEQVVUSCIsIlNFTlRfTE9HSU43X1dJVEhfTlRMTSIsImNhdGNoIiwicmVjb25uZWN0IiwicmV0cnkiLCJMb2dpbjdUb2tlbkhhbmRsZXIiLCJ0b2tlblN0cmVhbVBhcnNlciIsImxvZ2luQWNrUmVjZWl2ZWQiLCJMT0dHRURfSU5fU0VORElOR19JTklUSUFMX1NRTCIsIk5UTE1SZXNwb25zZVBheWxvYWQiLCJOVExNQVVUSF9QS1QiLCJmZWRBdXRoSW5mb1Rva2VuIiwic3RzdXJsIiwic3BuIiwidG9rZW5TY29wZSIsIlVSTCIsImNyZWRlbnRpYWxzIiwidG9rZW5SZXNwb25zZSIsImdldFRva2VuIiwiSW5pdGlhbFNxbFRva2VuSGFuZGxlciIsIlJlcXVlc3RUb2tlbkhhbmRsZXIiLCJTRU5UX0FUVEVOVElPTiIsIm9uUmVzdW1lIiwib25QYXVzZSIsInBhdXNlIiwib25FbmRPZk1lc3NhZ2UiLCJzcWxSZXF1ZXN0IiwibmV4dFN0YXRlIiwiQXR0ZW50aW9uVG9rZW5IYW5kbGVyIiwiYXR0ZW50aW9uUmVjZWl2ZWQiXSwic291cmNlcyI6WyIuLi9zcmMvY29ubmVjdGlvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSAnbmV0JztcbmltcG9ydCBkbnMgZnJvbSAnZG5zJztcblxuaW1wb3J0IGNvbnN0YW50cyBmcm9tICdjb25zdGFudHMnO1xuaW1wb3J0IHsgU2VjdXJlQ29udGV4dE9wdGlvbnMgfSBmcm9tICd0bHMnO1xuXG5pbXBvcnQgeyBSZWFkYWJsZSB9IGZyb20gJ3N0cmVhbSc7XG5cbmltcG9ydCBCdWxrTG9hZCwgeyBPcHRpb25zIGFzIEJ1bGtMb2FkT3B0aW9ucywgQ2FsbGJhY2sgYXMgQnVsa0xvYWRDYWxsYmFjayB9IGZyb20gJy4vYnVsay1sb2FkJztcbmltcG9ydCBEZWJ1ZyBmcm9tICcuL2RlYnVnJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciwgb25jZSB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgeyBpbnN0YW5jZUxvb2t1cCB9IGZyb20gJy4vaW5zdGFuY2UtbG9va3VwJztcbmltcG9ydCB7IFRyYW5zaWVudEVycm9yTG9va3VwIH0gZnJvbSAnLi90cmFuc2llbnQtZXJyb3ItbG9va3VwJztcbmltcG9ydCB7IFRZUEUgfSBmcm9tICcuL3BhY2tldCc7XG5pbXBvcnQgUHJlbG9naW5QYXlsb2FkIGZyb20gJy4vcHJlbG9naW4tcGF5bG9hZCc7XG5pbXBvcnQgTG9naW43UGF5bG9hZCBmcm9tICcuL2xvZ2luNy1wYXlsb2FkJztcbmltcG9ydCBOVExNUmVzcG9uc2VQYXlsb2FkIGZyb20gJy4vbnRsbS1wYXlsb2FkJztcbmltcG9ydCBSZXF1ZXN0IGZyb20gJy4vcmVxdWVzdCc7XG5pbXBvcnQgUnBjUmVxdWVzdFBheWxvYWQgZnJvbSAnLi9ycGNyZXF1ZXN0LXBheWxvYWQnO1xuaW1wb3J0IFNxbEJhdGNoUGF5bG9hZCBmcm9tICcuL3NxbGJhdGNoLXBheWxvYWQnO1xuaW1wb3J0IE1lc3NhZ2VJTyBmcm9tICcuL21lc3NhZ2UtaW8nO1xuaW1wb3J0IHsgUGFyc2VyIGFzIFRva2VuU3RyZWFtUGFyc2VyIH0gZnJvbSAnLi90b2tlbi90b2tlbi1zdHJlYW0tcGFyc2VyJztcbmltcG9ydCB7IFRyYW5zYWN0aW9uLCBJU09MQVRJT05fTEVWRUwsIGFzc2VydFZhbGlkSXNvbGF0aW9uTGV2ZWwgfSBmcm9tICcuL3RyYW5zYWN0aW9uJztcbmltcG9ydCB7IENvbm5lY3Rpb25FcnJvciwgUmVxdWVzdEVycm9yIH0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHsgY29ubmVjdEluUGFyYWxsZWwsIGNvbm5lY3RJblNlcXVlbmNlIH0gZnJvbSAnLi9jb25uZWN0b3InO1xuaW1wb3J0IHsgbmFtZSBhcyBsaWJyYXJ5TmFtZSB9IGZyb20gJy4vbGlicmFyeSc7XG5pbXBvcnQgeyB2ZXJzaW9ucyB9IGZyb20gJy4vdGRzLXZlcnNpb25zJztcbmltcG9ydCBNZXNzYWdlIGZyb20gJy4vbWVzc2FnZSc7XG5pbXBvcnQgeyBNZXRhZGF0YSB9IGZyb20gJy4vbWV0YWRhdGEtcGFyc2VyJztcbmltcG9ydCB7IGNyZWF0ZU5UTE1SZXF1ZXN0IH0gZnJvbSAnLi9udGxtJztcblxuaW1wb3J0IHsgQWJvcnRDb250cm9sbGVyLCBBYm9ydFNpZ25hbCB9IGZyb20gJ25vZGUtYWJvcnQtY29udHJvbGxlcic7XG5pbXBvcnQgeyBQYXJhbWV0ZXIsIFRZUEVTIH0gZnJvbSAnLi9kYXRhLXR5cGUnO1xuaW1wb3J0IHsgQnVsa0xvYWRQYXlsb2FkIH0gZnJvbSAnLi9idWxrLWxvYWQtcGF5bG9hZCc7XG5pbXBvcnQgeyBDb2xsYXRpb24gfSBmcm9tICcuL2NvbGxhdGlvbic7XG5cbmltcG9ydCBBZ2dyZWdhdGVFcnJvciBmcm9tICdlcy1hZ2dyZWdhdGUtZXJyb3InO1xuaW1wb3J0IHsgdmVyc2lvbiB9IGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5pbXBvcnQgeyBVUkwgfSBmcm9tICd1cmwnO1xuaW1wb3J0IHsgQXR0ZW50aW9uVG9rZW5IYW5kbGVyLCBJbml0aWFsU3FsVG9rZW5IYW5kbGVyLCBMb2dpbjdUb2tlbkhhbmRsZXIsIFJlcXVlc3RUb2tlbkhhbmRsZXIsIFRva2VuSGFuZGxlciB9IGZyb20gJy4vdG9rZW4vaGFuZGxlcic7XG5cbnR5cGUgQmVnaW5UcmFuc2FjdGlvbkNhbGxiYWNrID1cbiAgLyoqXG4gICAqIFRoZSBjYWxsYmFjayBpcyBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdCB0byBzdGFydCB0aGUgdHJhbnNhY3Rpb24gaGFzIGNvbXBsZXRlZCxcbiAgICogZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCB0aGVuIGBlcnJgIHdpbGwgZGVzY3JpYmUgdGhlIGVycm9yLlxuICAgKlxuICAgKiBBcyBvbmx5IG9uZSByZXF1ZXN0IGF0IGEgdGltZSBtYXkgYmUgZXhlY3V0ZWQgb24gYSBjb25uZWN0aW9uLCBhbm90aGVyIHJlcXVlc3Qgc2hvdWxkIG5vdFxuICAgKiBiZSBpbml0aWF0ZWQgdW50aWwgdGhpcyBjYWxsYmFjayBpcyBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBlcnIgSWYgYW4gZXJyb3Igb2NjdXJyZWQsIGFuIFtbRXJyb3JdXSBvYmplY3Qgd2l0aCBkZXRhaWxzIG9mIHRoZSBlcnJvci5cbiAgICogQHBhcmFtIHRyYW5zYWN0aW9uRGVzY3JpcHRvciBBIEJ1ZmZlciB0aGF0IGRlc2NyaWJlIHRoZSB0cmFuc2FjdGlvblxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCB0cmFuc2FjdGlvbkRlc2NyaXB0b3I/OiBCdWZmZXIpID0+IHZvaWRcblxudHlwZSBTYXZlVHJhbnNhY3Rpb25DYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gc2V0IGEgc2F2ZXBvaW50IHdpdGhpbiB0aGVcbiAgICogdHJhbnNhY3Rpb24gaGFzIGNvbXBsZXRlZCwgZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCB0aGVuIGBlcnJgIHdpbGwgZGVzY3JpYmUgdGhlIGVycm9yLlxuICAgKlxuICAgKiBBcyBvbmx5IG9uZSByZXF1ZXN0IGF0IGEgdGltZSBtYXkgYmUgZXhlY3V0ZWQgb24gYSBjb25uZWN0aW9uLCBhbm90aGVyIHJlcXVlc3Qgc2hvdWxkIG5vdFxuICAgKiBiZSBpbml0aWF0ZWQgdW50aWwgdGhpcyBjYWxsYmFjayBpcyBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBlcnIgSWYgYW4gZXJyb3Igb2NjdXJyZWQsIGFuIFtbRXJyb3JdXSBvYmplY3Qgd2l0aCBkZXRhaWxzIG9mIHRoZSBlcnJvci5cbiAgICovXG4gIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4gdm9pZDtcblxudHlwZSBDb21taXRUcmFuc2FjdGlvbkNhbGxiYWNrID1cbiAgLyoqXG4gICAqIFRoZSBjYWxsYmFjayBpcyBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdCB0byBjb21taXQgdGhlIHRyYW5zYWN0aW9uIGhhcyBjb21wbGV0ZWQsXG4gICAqIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQpID0+IHZvaWQ7XG5cbnR5cGUgUm9sbGJhY2tUcmFuc2FjdGlvbkNhbGxiYWNrID1cbiAgLyoqXG4gICAqIFRoZSBjYWxsYmFjayBpcyBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdCB0byByb2xsYmFjayB0aGUgdHJhbnNhY3Rpb24gaGFzXG4gICAqIGNvbXBsZXRlZCwgZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCB0aGVuIGVyciB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQpID0+IHZvaWQ7XG5cbnR5cGUgUmVzZXRDYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbm5lY3Rpb24gcmVzZXQgaGFzIGNvbXBsZXRlZCxcbiAgICogZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCB0aGVuIGBlcnJgIHdpbGwgZGVzY3JpYmUgdGhlIGVycm9yLlxuICAgKlxuICAgKiBBcyBvbmx5IG9uZSByZXF1ZXN0IGF0IGEgdGltZSBtYXkgYmUgZXhlY3V0ZWQgb24gYSBjb25uZWN0aW9uLCBhbm90aGVyXG4gICAqIHJlcXVlc3Qgc2hvdWxkIG5vdCBiZSBpbml0aWF0ZWQgdW50aWwgdGhpcyBjYWxsYmFjayBpcyBjYWxsZWRcbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnJvciBvY2N1cnJlZCwgYW4gW1tFcnJvcl1dIG9iamVjdCB3aXRoIGRldGFpbHMgb2YgdGhlIGVycm9yLlxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG50eXBlIFRyYW5zYWN0aW9uQ2FsbGJhY2s8VCBleHRlbmRzIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pID0+IHZvaWQ+ID1cbiAgLyoqXG4gICAqIFRoZSBjYWxsYmFjayBpcyBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdCB0byBzdGFydCBhIHRyYW5zYWN0aW9uIChvciBjcmVhdGUgYSBzYXZlcG9pbnQsIGluXG4gICAqIHRoZSBjYXNlIG9mIGEgbmVzdGVkIHRyYW5zYWN0aW9uKSBoYXMgY29tcGxldGVkLCBlaXRoZXIgc3VjY2Vzc2Z1bGx5IG9yIHdpdGggYW4gZXJyb3IuXG4gICAqIElmIGFuIGVycm9yIG9jY3VycmVkLCB0aGVuIGBlcnJgIHdpbGwgZGVzY3JpYmUgdGhlIGVycm9yLlxuICAgKiBJZiBubyBlcnJvciBvY2N1cnJlZCwgdGhlIGNhbGxiYWNrIHNob3VsZCBwZXJmb3JtIGl0cyB3b3JrIGFuZCBldmVudHVhbGx5IGNhbGxcbiAgICogYGRvbmVgIHdpdGggYW4gZXJyb3Igb3IgbnVsbCAodG8gdHJpZ2dlciBhIHRyYW5zYWN0aW9uIHJvbGxiYWNrIG9yIGFcbiAgICogdHJhbnNhY3Rpb24gY29tbWl0KSBhbmQgYW4gYWRkaXRpb25hbCBjb21wbGV0aW9uIGNhbGxiYWNrIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdFxuICAgKiB0byByb2xsYmFjayBvciBjb21taXQgdGhlIGN1cnJlbnQgdHJhbnNhY3Rpb24gaGFzIGNvbXBsZXRlZCwgZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBBZGRpdGlvbmFsIGFyZ3VtZW50cyBnaXZlbiB0byBgZG9uZWAgd2lsbCBiZSBwYXNzZWQgdGhyb3VnaCB0byB0aGlzIGNhbGxiYWNrLlxuICAgKlxuICAgKiBBcyBvbmx5IG9uZSByZXF1ZXN0IGF0IGEgdGltZSBtYXkgYmUgZXhlY3V0ZWQgb24gYSBjb25uZWN0aW9uLCBhbm90aGVyIHJlcXVlc3Qgc2hvdWxkIG5vdFxuICAgKiBiZSBpbml0aWF0ZWQgdW50aWwgdGhlIGNvbXBsZXRpb24gY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqIEBwYXJhbSB0eERvbmUgSWYgbm8gZXJyb3Igb2NjdXJyZWQsIGEgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHRvIGNvbW1pdCBvciByb2xsYmFjayB0aGUgdHJhbnNhY3Rpb24uXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIHR4RG9uZT86IFRyYW5zYWN0aW9uRG9uZTxUPikgPT4gdm9pZDtcblxudHlwZSBUcmFuc2FjdGlvbkRvbmVDYWxsYmFjayA9IChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pID0+IHZvaWQ7XG50eXBlIENhbGxiYWNrUGFyYW1ldGVyczxUIGV4dGVuZHMgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCAuLi5hcmdzOiBhbnlbXSkgPT4gYW55PiA9IFQgZXh0ZW5kcyAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIC4uLmFyZ3M6IGluZmVyIFApID0+IGFueSA/IFAgOiBuZXZlcjtcblxudHlwZSBUcmFuc2FjdGlvbkRvbmU8VCBleHRlbmRzIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pID0+IHZvaWQ+ID1cbiAgLyoqXG4gICAqIElmIG5vIGVycm9yIG9jY3VycmVkLCBhIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB0byBjb21taXQgb3Igcm9sbGJhY2sgdGhlIHRyYW5zYWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVyciBvY2N1cnJlZCwgYSBzdHJpbmcgd2l0aCBkZXRhaWxzIG9mIHRoZSBlcnJvci5cbiAgICovXG4gIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgZG9uZTogVCwgLi4uYXJnczogQ2FsbGJhY2tQYXJhbWV0ZXJzPFQ+KSA9PiB2b2lkO1xuXG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IEtFRVBfQUxJVkVfSU5JVElBTF9ERUxBWSA9IDMwICogMTAwMDtcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9DT05ORUNUX1RJTUVPVVQgPSAxNSAqIDEwMDA7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfQ0xJRU5UX1JFUVVFU1RfVElNRU9VVCA9IDE1ICogMTAwMDtcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9DQU5DRUxfVElNRU9VVCA9IDUgKiAxMDAwO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0NPTk5FQ1RfUkVUUllfSU5URVJWQUwgPSA1MDA7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfUEFDS0VUX1NJWkUgPSA0ICogMTAyNDtcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9URVhUU0laRSA9IDIxNDc0ODM2NDc7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfREFURUZJUlNUID0gNztcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9QT1JUID0gMTQzMztcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9URFNfVkVSU0lPTiA9ICc3XzQnO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0xBTkdVQUdFID0gJ3VzX2VuZ2xpc2gnO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0RBVEVGT1JNQVQgPSAnbWR5JztcblxuaW50ZXJmYWNlIEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpQXBwU2VydmljZUF1dGhlbnRpY2F0aW9uIHtcbiAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlJztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIElmIHlvdSB1c2VyIHdhbnQgdG8gY29ubmVjdCB0byBhbiBBenVyZSBhcHAgc2VydmljZSB1c2luZyBhIHNwZWNpZmljIGNsaWVudCBhY2NvdW50XG4gICAgICogdGhleSBuZWVkIHRvIHByb3ZpZGUgYGNsaWVudElkYCBhc3Njb2lhdGUgdG8gdGhlaXIgY3JlYXRlZCBpZG5ldGl0eS5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgb3B0aW9uYWwgZm9yIHJldHJpZXZlIHRva2VuIGZyb20gYXp1cmUgd2ViIGFwcCBzZXJ2aWNlXG4gICAgICovXG4gICAgY2xpZW50SWQ/OiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaVZtQXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm0nO1xuICBvcHRpb25zOiB7XG4gICAgLyoqXG4gICAgICogSWYgeW91IHdhbnQgdG8gY29ubmVjdCB1c2luZyBhIHNwZWNpZmljIGNsaWVudCBhY2NvdW50XG4gICAgICogdGhleSBuZWVkIHRvIHByb3ZpZGUgYGNsaWVudElkYCBhc3NvY2lhdGVkIHRvIHRoZWlyIGNyZWF0ZWQgaWRlbnRpdHkuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIG9wdGlvbmFsIGZvciByZXRyaWV2ZSBhIHRva2VuXG4gICAgICovXG4gICAgY2xpZW50SWQ/OiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeURlZmF1bHRBdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnO1xuICBvcHRpb25zOiB7XG4gICAgLyoqXG4gICAgICogSWYgeW91IHdhbnQgdG8gY29ubmVjdCB1c2luZyBhIHNwZWNpZmljIGNsaWVudCBhY2NvdW50XG4gICAgICogdGhleSBuZWVkIHRvIHByb3ZpZGUgYGNsaWVudElkYCBhc3NvY2lhdGVkIHRvIHRoZWlyIGNyZWF0ZWQgaWRlbnRpdHkuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIG9wdGlvbmFsIGZvciByZXRyaWV2aW5nIGEgdG9rZW5cbiAgICAgKi9cbiAgICBjbGllbnRJZD86IHN0cmluZztcbiAgfTtcbn1cblxuXG5pbnRlcmZhY2UgQXp1cmVBY3RpdmVEaXJlY3RvcnlBY2Nlc3NUb2tlbkF1dGhlbnRpY2F0aW9uIHtcbiAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuJztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIEEgdXNlciBuZWVkIHRvIHByb3ZpZGUgYHRva2VuYCB3aGljaCB0aGV5IHJldHJpdmVkIGVsc2Ugd2hlcmVcbiAgICAgKiB0byBmb3JtaW5nIHRoZSBjb25uZWN0aW9uLlxuICAgICAqL1xuICAgIHRva2VuOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBBIHVzZXIgbmVlZCB0byBwcm92aWRlIGB1c2VyTmFtZWAgYXNzY29pYXRlIHRvIHRoZWlyIGFjY291bnQuXG4gICAgICovXG4gICAgdXNlck5hbWU6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEEgdXNlciBuZWVkIHRvIHByb3ZpZGUgYHBhc3N3b3JkYCBhc3Njb2lhdGUgdG8gdGhlaXIgYWNjb3VudC5cbiAgICAgKi9cbiAgICBwYXNzd29yZDogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQSBjbGllbnQgaWQgdG8gdXNlLlxuICAgICAqL1xuICAgIGNsaWVudElkOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBPcHRpb25hbCBwYXJhbWV0ZXIgZm9yIHNwZWNpZmljIEF6dXJlIHRlbmFudCBJRFxuICAgICAqL1xuICAgIHRlbmFudElkOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeVNlcnZpY2VQcmluY2lwYWxTZWNyZXQge1xuICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnO1xuICBvcHRpb25zOiB7XG4gICAgLyoqXG4gICAgICogQXBwbGljYXRpb24gKGBjbGllbnRgKSBJRCBmcm9tIHlvdXIgcmVnaXN0ZXJlZCBBenVyZSBhcHBsaWNhdGlvblxuICAgICAqL1xuICAgIGNsaWVudElkOiBzdHJpbmc7XG4gICAgLyoqXG4gICAgICogVGhlIGNyZWF0ZWQgYGNsaWVudCBzZWNyZXRgIGZvciB0aGlzIHJlZ2lzdGVyZWQgQXp1cmUgYXBwbGljYXRpb25cbiAgICAgKi9cbiAgICBjbGllbnRTZWNyZXQ6IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBEaXJlY3RvcnkgKGB0ZW5hbnRgKSBJRCBmcm9tIHlvdXIgcmVnaXN0ZXJlZCBBenVyZSBhcHBsaWNhdGlvblxuICAgICAqL1xuICAgIHRlbmFudElkOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBOdGxtQXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnbnRsbSc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBVc2VyIG5hbWUgZnJvbSB5b3VyIHdpbmRvd3MgYWNjb3VudC5cbiAgICAgKi9cbiAgICB1c2VyTmFtZTogc3RyaW5nO1xuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIGZyb20geW91ciB3aW5kb3dzIGFjY291bnQuXG4gICAgICovXG4gICAgcGFzc3dvcmQ6IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBPbmNlIHlvdSBzZXQgZG9tYWluIGZvciBudGxtIGF1dGhlbnRpY2F0aW9uIHR5cGUsIGRyaXZlciB3aWxsIGNvbm5lY3QgdG8gU1FMIFNlcnZlciB1c2luZyBkb21haW4gbG9naW4uXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIG5lY2Vzc2FyeSBmb3IgZm9ybWluZyBhIGNvbm5lY3Rpb24gdXNpbmcgbnRsbSB0eXBlXG4gICAgICovXG4gICAgZG9tYWluOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBEZWZhdWx0QXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnZGVmYXVsdCc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBVc2VyIG5hbWUgdG8gdXNlIGZvciBzcWwgc2VydmVyIGxvZ2luLlxuICAgICAqL1xuICAgIHVzZXJOYW1lPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHRvIHVzZSBmb3Igc3FsIHNlcnZlciBsb2dpbi5cbiAgICAgKi9cbiAgICBwYXNzd29yZD86IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIEVycm9yV2l0aENvZGUgZXh0ZW5kcyBFcnJvciB7XG4gIGNvZGU/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBJbnRlcm5hbENvbm5lY3Rpb25Db25maWcge1xuICBzZXJ2ZXI6IHN0cmluZztcbiAgYXV0aGVudGljYXRpb246IERlZmF1bHRBdXRoZW50aWNhdGlvbiB8IE50bG1BdXRoZW50aWNhdGlvbiB8IEF6dXJlQWN0aXZlRGlyZWN0b3J5UGFzc3dvcmRBdXRoZW50aWNhdGlvbiB8IEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpQXBwU2VydmljZUF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lWbUF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlBY2Nlc3NUb2tlbkF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlTZXJ2aWNlUHJpbmNpcGFsU2VjcmV0IHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlEZWZhdWx0QXV0aGVudGljYXRpb247XG4gIG9wdGlvbnM6IEludGVybmFsQ29ubmVjdGlvbk9wdGlvbnM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW50ZXJuYWxDb25uZWN0aW9uT3B0aW9ucyB7XG4gIGFib3J0VHJhbnNhY3Rpb25PbkVycm9yOiBib29sZWFuO1xuICBhcHBOYW1lOiB1bmRlZmluZWQgfCBzdHJpbmc7XG4gIGNhbWVsQ2FzZUNvbHVtbnM6IGJvb2xlYW47XG4gIGNhbmNlbFRpbWVvdXQ6IG51bWJlcjtcbiAgY29sdW1uRW5jcnlwdGlvbktleUNhY2hlVFRMOiBudW1iZXI7XG4gIGNvbHVtbkVuY3J5cHRpb25TZXR0aW5nOiBib29sZWFuO1xuICBjb2x1bW5OYW1lUmVwbGFjZXI6IHVuZGVmaW5lZCB8ICgoY29sTmFtZTogc3RyaW5nLCBpbmRleDogbnVtYmVyLCBtZXRhZGF0YTogTWV0YWRhdGEpID0+IHN0cmluZyk7XG4gIGNvbm5lY3Rpb25SZXRyeUludGVydmFsOiBudW1iZXI7XG4gIGNvbm5lY3RUaW1lb3V0OiBudW1iZXI7XG4gIGNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbDogdHlwZW9mIElTT0xBVElPTl9MRVZFTFtrZXlvZiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMXTtcbiAgY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzOiBTZWN1cmVDb250ZXh0T3B0aW9ucztcbiAgZGF0YWJhc2U6IHVuZGVmaW5lZCB8IHN0cmluZztcbiAgZGF0ZWZpcnN0OiBudW1iZXI7XG4gIGRhdGVGb3JtYXQ6IHN0cmluZztcbiAgZGVidWc6IHtcbiAgICBkYXRhOiBib29sZWFuO1xuICAgIHBhY2tldDogYm9vbGVhbjtcbiAgICBwYXlsb2FkOiBib29sZWFuO1xuICAgIHRva2VuOiBib29sZWFuO1xuICB9O1xuICBlbmFibGVBbnNpTnVsbDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUFuc2lOdWxsRGVmYXVsdDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUFuc2lQYWRkaW5nOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQW5zaVdhcm5pbmdzOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQXJpdGhBYm9ydDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ6IG51bGwgfCBib29sZWFuO1xuICBlbmFibGVRdW90ZWRJZGVudGlmaWVyOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5jcnlwdDogYm9vbGVhbjtcbiAgZW5jcnlwdGlvbktleVN0b3JlUHJvdmlkZXJzOiB1bmRlZmluZWQ7XG4gIGZhbGxiYWNrVG9EZWZhdWx0RGI6IGJvb2xlYW47XG4gIGluc3RhbmNlTmFtZTogdW5kZWZpbmVkIHwgc3RyaW5nO1xuICBpc29sYXRpb25MZXZlbDogdHlwZW9mIElTT0xBVElPTl9MRVZFTFtrZXlvZiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMXTtcbiAgbGFuZ3VhZ2U6IHN0cmluZztcbiAgbG9jYWxBZGRyZXNzOiB1bmRlZmluZWQgfCBzdHJpbmc7XG4gIG1heFJldHJpZXNPblRyYW5zaWVudEVycm9yczogbnVtYmVyO1xuICBtdWx0aVN1Ym5ldEZhaWxvdmVyOiBib29sZWFuO1xuICBwYWNrZXRTaXplOiBudW1iZXI7XG4gIHBvcnQ6IHVuZGVmaW5lZCB8IG51bWJlcjtcbiAgcmVhZE9ubHlJbnRlbnQ6IGJvb2xlYW47XG4gIHJlcXVlc3RUaW1lb3V0OiBudW1iZXI7XG4gIHJvd0NvbGxlY3Rpb25PbkRvbmU6IGJvb2xlYW47XG4gIHJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uOiBib29sZWFuO1xuICBzZXJ2ZXJOYW1lOiB1bmRlZmluZWQgfCBzdHJpbmc7XG4gIHNlcnZlclN1cHBvcnRzQ29sdW1uRW5jcnlwdGlvbjogYm9vbGVhbjtcbiAgdGRzVmVyc2lvbjogc3RyaW5nO1xuICB0ZXh0c2l6ZTogbnVtYmVyO1xuICB0cnVzdGVkU2VydmVyTmFtZUFFOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHRydXN0U2VydmVyQ2VydGlmaWNhdGU6IGJvb2xlYW47XG4gIHVzZUNvbHVtbk5hbWVzOiBib29sZWFuO1xuICB1c2VVVEM6IGJvb2xlYW47XG4gIHdvcmtzdGF0aW9uSWQ6IHVuZGVmaW5lZCB8IHN0cmluZztcbiAgbG93ZXJDYXNlR3VpZHM6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuaW50ZXJmYWNlIFN0YXRlIHtcbiAgbmFtZTogc3RyaW5nO1xuICBlbnRlcj8odGhpczogQ29ubmVjdGlvbik6IHZvaWQ7XG4gIGV4aXQ/KHRoaXM6IENvbm5lY3Rpb24sIG5ld1N0YXRlOiBTdGF0ZSk6IHZvaWQ7XG4gIGV2ZW50czoge1xuICAgIHNvY2tldEVycm9yPyh0aGlzOiBDb25uZWN0aW9uLCBlcnI6IEVycm9yKTogdm9pZDtcbiAgICBjb25uZWN0VGltZW91dD8odGhpczogQ29ubmVjdGlvbik6IHZvaWQ7XG4gICAgbWVzc2FnZT8odGhpczogQ29ubmVjdGlvbiwgbWVzc2FnZTogTWVzc2FnZSk6IHZvaWQ7XG4gICAgcmV0cnk/KHRoaXM6IENvbm5lY3Rpb24pOiB2b2lkO1xuICAgIHJlY29ubmVjdD8odGhpczogQ29ubmVjdGlvbik6IHZvaWQ7XG4gIH07XG59XG5cbnR5cGUgQXV0aGVudGljYXRpb24gPSBEZWZhdWx0QXV0aGVudGljYXRpb24gfFxuICBOdGxtQXV0aGVudGljYXRpb24gfFxuICBBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24gfFxuICBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpVm1BdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5QWNjZXNzVG9rZW5BdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5U2VydmljZVByaW5jaXBhbFNlY3JldCB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5RGVmYXVsdEF1dGhlbnRpY2F0aW9uO1xuXG50eXBlIEF1dGhlbnRpY2F0aW9uVHlwZSA9IEF1dGhlbnRpY2F0aW9uWyd0eXBlJ107XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdGlvbkNvbmZpZ3VyYXRpb24ge1xuICAvKipcbiAgICogSG9zdG5hbWUgdG8gY29ubmVjdCB0by5cbiAgICovXG4gIHNlcnZlcjogc3RyaW5nO1xuICAvKipcbiAgICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBmb3JtaW5nIHRoZSBjb25uZWN0aW9uLlxuICAgKi9cbiAgb3B0aW9ucz86IENvbm5lY3Rpb25PcHRpb25zO1xuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gcmVhbHRlZCBvcHRpb25zIGZvciBjb25uZWN0aW9uLlxuICAgKi9cbiAgYXV0aGVudGljYXRpb24/OiBBdXRoZW50aWNhdGlvbk9wdGlvbnM7XG59XG5cbmludGVyZmFjZSBEZWJ1Z09wdGlvbnMge1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBkYXRhIGRldGFpbHNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBkYXRhOiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBkZXRhaWxzXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgcGFja2V0OiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBwYXlsb2FkIGRldGFpbHNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBwYXlsb2FkOiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHRva2VuIHN0cmVhbSB0b2tlbnNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICB0b2tlbjogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIEF1dGhlbnRpY2F0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBUeXBlIG9mIHRoZSBhdXRoZW50aWNhdGlvbiBtZXRob2QsIHZhbGlkIHR5cGVzIGFyZSBgZGVmYXVsdGAsIGBudGxtYCxcbiAgICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmRgLCBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW5gLFxuICAgKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm1gLCBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2VgLFxuICAgKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0YFxuICAgKiBvciBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXRgXG4gICAqL1xuICB0eXBlPzogQXV0aGVudGljYXRpb25UeXBlO1xuICAvKipcbiAgICogRGlmZmVyZW50IG9wdGlvbnMgZm9yIGF1dGhlbnRpY2F0aW9uIHR5cGVzOlxuICAgKlxuICAgKiAqIGBkZWZhdWx0YDogW1tEZWZhdWx0QXV0aGVudGljYXRpb24ub3B0aW9uc11dXG4gICAqICogYG50bG1gIDpbW050bG1BdXRoZW50aWNhdGlvbl1dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmRgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24ub3B0aW9uc11dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuYCA6IFtbQXp1cmVBY3RpdmVEaXJlY3RvcnlBY2Nlc3NUb2tlbkF1dGhlbnRpY2F0aW9uLm9wdGlvbnNdXVxuICAgKiAqIGBhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bWAgOiBbW0F6dXJlQWN0aXZlRGlyZWN0b3J5TXNpVm1BdXRoZW50aWNhdGlvbi5vcHRpb25zXV1cbiAgICogKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2VgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbi5vcHRpb25zXV1cbiAgICogKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXRgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeVNlcnZpY2VQcmluY2lwYWxTZWNyZXQub3B0aW9uc11dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdGAgOiBbW0F6dXJlQWN0aXZlRGlyZWN0b3J5RGVmYXVsdEF1dGhlbnRpY2F0aW9uLm9wdGlvbnNdXVxuICAgKi9cbiAgb3B0aW9ucz86IGFueTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb25uZWN0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byByb2xsYmFjayBhIHRyYW5zYWN0aW9uIGF1dG9tYXRpY2FsbHkgaWYgYW55IGVycm9yIGlzIGVuY291bnRlcmVkXG4gICAqIGR1cmluZyB0aGUgZ2l2ZW4gdHJhbnNhY3Rpb24ncyBleGVjdXRpb24uIFRoaXMgc2V0cyB0aGUgdmFsdWUgZm9yIGBTRVQgWEFDVF9BQk9SVGAgZHVyaW5nIHRoZVxuICAgKiBpbml0aWFsIFNRTCBwaGFzZSBvZiBhIGNvbm5lY3Rpb24gW2RvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3NxbC90LXNxbC9zdGF0ZW1lbnRzL3NldC14YWN0LWFib3J0LXRyYW5zYWN0LXNxbCkuXG4gICAqL1xuICBhYm9ydFRyYW5zYWN0aW9uT25FcnJvcj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFwcGxpY2F0aW9uIG5hbWUgdXNlZCBmb3IgaWRlbnRpZnlpbmcgYSBzcGVjaWZpYyBhcHBsaWNhdGlvbiBpbiBwcm9maWxpbmcsIGxvZ2dpbmcgb3IgdHJhY2luZyB0b29scyBvZiBTUUxTZXJ2ZXIuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgVGVkaW91c2ApXG4gICAqL1xuICBhcHBOYW1lPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGNvbnRyb2xsaW5nIHdoZXRoZXIgdGhlIGNvbHVtbiBuYW1lcyByZXR1cm5lZCB3aWxsIGhhdmUgdGhlIGZpcnN0IGxldHRlciBjb252ZXJ0ZWQgdG8gbG93ZXIgY2FzZVxuICAgKiAoYHRydWVgKSBvciBub3QuIFRoaXMgdmFsdWUgaXMgaWdub3JlZCBpZiB5b3UgcHJvdmlkZSBhIFtbY29sdW1uTmFtZVJlcGxhY2VyXV0uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICovXG4gIGNhbWVsQ2FzZUNvbHVtbnM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZWZvcmUgdGhlIFtbUmVxdWVzdC5jYW5jZWxdXSAoYWJvcnQpIG9mIGEgcmVxdWVzdCBpcyBjb25zaWRlcmVkIGZhaWxlZFxuICAgKlxuICAgKiAoZGVmYXVsdDogYDUwMDBgKS5cbiAgICovXG4gIGNhbmNlbFRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gd2l0aCBwYXJhbWV0ZXJzIGAoY29sdW1uTmFtZSwgaW5kZXgsIGNvbHVtbk1ldGFEYXRhKWAgYW5kIHJldHVybmluZyBhIHN0cmluZy4gSWYgcHJvdmlkZWQsXG4gICAqIHRoaXMgd2lsbCBiZSBjYWxsZWQgb25jZSBwZXIgY29sdW1uIHBlciByZXN1bHQtc2V0LiBUaGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBiZSB1c2VkIGluc3RlYWQgb2YgdGhlIFNRTC1wcm92aWRlZFxuICAgKiBjb2x1bW4gbmFtZSBvbiByb3cgYW5kIG1ldGEgZGF0YSBvYmplY3RzLiBUaGlzIGFsbG93cyB5b3UgdG8gZHluYW1pY2FsbHkgY29udmVydCBiZXR3ZWVuIG5hbWluZyBjb252ZW50aW9ucy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBudWxsYClcbiAgICovXG4gIGNvbHVtbk5hbWVSZXBsYWNlcj86IChjb2xOYW1lOiBzdHJpbmcsIGluZGV4OiBudW1iZXIsIG1ldGFkYXRhOiBNZXRhZGF0YSkgPT4gc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgbWlsbGlzZWNvbmRzIGJlZm9yZSByZXRyeWluZyB0byBlc3RhYmxpc2ggY29ubmVjdGlvbiwgaW4gY2FzZSBvZiB0cmFuc2llbnQgZmFpbHVyZS5cbiAgICpcbiAgICogKGRlZmF1bHQ6YDUwMGApXG4gICAqL1xuICBjb25uZWN0aW9uUmV0cnlJbnRlcnZhbD86IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgYmVmb3JlIHRoZSBhdHRlbXB0IHRvIGNvbm5lY3QgaXMgY29uc2lkZXJlZCBmYWlsZWRcbiAgICpcbiAgICogKGRlZmF1bHQ6IGAxNTAwMGApLlxuICAgKi9cbiAgY29ubmVjdFRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGlzb2xhdGlvbiBsZXZlbCBmb3IgbmV3IGNvbm5lY3Rpb25zLiBBbGwgb3V0LW9mLXRyYW5zYWN0aW9uIHF1ZXJpZXMgYXJlIGV4ZWN1dGVkIHdpdGggdGhpcyBzZXR0aW5nLlxuICAgKlxuICAgKiBUaGUgaXNvbGF0aW9uIGxldmVscyBhcmUgYXZhaWxhYmxlIGZyb20gYHJlcXVpcmUoJ3RlZGlvdXMnKS5JU09MQVRJT05fTEVWRUxgLlxuICAgKiAqIGBSRUFEX1VOQ09NTUlUVEVEYFxuICAgKiAqIGBSRUFEX0NPTU1JVFRFRGBcbiAgICogKiBgUkVQRUFUQUJMRV9SRUFEYFxuICAgKiAqIGBTRVJJQUxJWkFCTEVgXG4gICAqICogYFNOQVBTSE9UYFxuICAgKlxuICAgKiAoZGVmYXVsdDogYFJFQURfQ09NTUlURURgKS5cbiAgICovXG4gIGNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbD86IG51bWJlcjtcblxuICAvKipcbiAgICogV2hlbiBlbmNyeXB0aW9uIGlzIHVzZWQsIGFuIG9iamVjdCBtYXkgYmUgc3VwcGxpZWQgdGhhdCB3aWxsIGJlIHVzZWRcbiAgICogZm9yIHRoZSBmaXJzdCBhcmd1bWVudCB3aGVuIGNhbGxpbmcgW2B0bHMuY3JlYXRlU2VjdXJlUGFpcmBdKGh0dHA6Ly9ub2RlanMub3JnL2RvY3MvbGF0ZXN0L2FwaS90bHMuaHRtbCN0bHNfdGxzX2NyZWF0ZXNlY3VyZXBhaXJfY3JlZGVudGlhbHNfaXNzZXJ2ZXJfcmVxdWVzdGNlcnRfcmVqZWN0dW5hdXRob3JpemVkKVxuICAgKlxuICAgKiAoZGVmYXVsdDogYHt9YClcbiAgICovXG4gIGNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscz86IFNlY3VyZUNvbnRleHRPcHRpb25zO1xuXG4gIC8qKlxuICAgKiBEYXRhYmFzZSB0byBjb25uZWN0IHRvIChkZWZhdWx0OiBkZXBlbmRlbnQgb24gc2VydmVyIGNvbmZpZ3VyYXRpb24pLlxuICAgKi9cbiAgZGF0YWJhc2U/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGZpcnN0IGRheSBvZiB0aGUgd2VlayB0byBhIG51bWJlciBmcm9tIDEgdGhyb3VnaCA3LlxuICAgKi9cbiAgZGF0ZWZpcnN0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBBIHN0cmluZyByZXByZXNlbnRpbmcgcG9zaXRpb24gb2YgbW9udGgsIGRheSBhbmQgeWVhciBpbiB0ZW1wb3JhbCBkYXRhdHlwZXMuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgbWR5YClcbiAgICovXG4gIGRhdGVGb3JtYXQ/OiBzdHJpbmc7XG5cbiAgZGVidWc/OiBEZWJ1Z09wdGlvbnM7XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgY29udHJvbHMgdGhlIHdheSBudWxsIHZhbHVlcyBzaG91bGQgYmUgdXNlZCBkdXJpbmcgY29tcGFyaXNvbiBvcGVyYXRpb24uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmFibGVBbnNpTnVsbD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIHRydWUsIGBTRVQgQU5TSV9OVUxMX0RGTFRfT04gT05gIHdpbGwgYmUgc2V0IGluIHRoZSBpbml0aWFsIHNxbC4gVGhpcyBtZWFucyBuZXcgY29sdW1ucyB3aWxsIGJlXG4gICAqIG51bGxhYmxlIGJ5IGRlZmF1bHQuIFNlZSB0aGUgW1QtU1FMIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXMxODczNzUuYXNweClcbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYCkuXG4gICAqL1xuICBlbmFibGVBbnNpTnVsbERlZmF1bHQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGNvbnRyb2xzIGlmIHBhZGRpbmcgc2hvdWxkIGJlIGFwcGxpZWQgZm9yIHZhbHVlcyBzaG9ydGVyIHRoYW4gdGhlIHNpemUgb2YgZGVmaW5lZCBjb2x1bW4uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmFibGVBbnNpUGFkZGluZz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIHRydWUsIFNRTCBTZXJ2ZXIgd2lsbCBmb2xsb3cgSVNPIHN0YW5kYXJkIGJlaGF2aW9yIGR1cmluZyB2YXJpb3VzIGVycm9yIGNvbmRpdGlvbnMuIEZvciBkZXRhaWxzLFxuICAgKiBzZWUgW2RvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3NxbC90LXNxbC9zdGF0ZW1lbnRzL3NldC1hbnNpLXdhcm5pbmdzLXRyYW5zYWN0LXNxbClcbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuYWJsZUFuc2lXYXJuaW5ncz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEVuZHMgYSBxdWVyeSB3aGVuIGFuIG92ZXJmbG93IG9yIGRpdmlkZS1ieS16ZXJvIGVycm9yIG9jY3VycyBkdXJpbmcgcXVlcnkgZXhlY3V0aW9uLlxuICAgKiBTZWUgW2RvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3NxbC90LXNxbC9zdGF0ZW1lbnRzL3NldC1hcml0aGFib3J0LXRyYW5zYWN0LXNxbD92aWV3PXNxbC1zZXJ2ZXItMjAxNylcbiAgICogZm9yIG1vcmUgZGV0YWlscy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuYWJsZUFyaXRoQWJvcnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGRldGVybWluZXMgaWYgY29uY2F0ZW5hdGlvbiB3aXRoIE5VTEwgc2hvdWxkIHJlc3VsdCBpbiBOVUxMIG9yIGVtcHR5IHN0cmluZyB2YWx1ZSwgbW9yZSBkZXRhaWxzIGluXG4gICAqIFtkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9zcWwvdC1zcWwvc3RhdGVtZW50cy9zZXQtY29uY2F0LW51bGwteWllbGRzLW51bGwtdHJhbnNhY3Qtc3FsKVxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGw/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGNvbnRyb2xzIHdoZXRoZXIgY3Vyc29yIHNob3VsZCBiZSBjbG9zZWQsIGlmIHRoZSB0cmFuc2FjdGlvbiBvcGVuaW5nIGl0IGdldHMgY29tbWl0dGVkIG9yIHJvbGxlZFxuICAgKiBiYWNrLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYG51bGxgKVxuICAgKi9cbiAgZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdD86IGJvb2xlYW4gfCBudWxsO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIHNldHMgdGhlIGNvbm5lY3Rpb24gdG8gZWl0aGVyIGltcGxpY2l0IG9yIGF1dG9jb21taXQgdHJhbnNhY3Rpb24gbW9kZS5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBlbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIGZhbHNlLCBlcnJvciBpcyBub3QgZ2VuZXJhdGVkIGR1cmluZyBsb3NzIG9mIHByZWNlc3Npb24uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJZiB0cnVlLCBjaGFyYWN0ZXJzIGVuY2xvc2VkIGluIHNpbmdsZSBxdW90ZXMgYXJlIHRyZWF0ZWQgYXMgbGl0ZXJhbHMgYW5kIHRob3NlIGVuY2xvc2VkIGRvdWJsZSBxdW90ZXMgYXJlIHRyZWF0ZWQgYXMgaWRlbnRpZmllcnMuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmFibGVRdW90ZWRJZGVudGlmaWVyPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQSBib29sZWFuIGRldGVybWluaW5nIHdoZXRoZXIgb3Igbm90IHRoZSBjb25uZWN0aW9uIHdpbGwgYmUgZW5jcnlwdGVkLiBTZXQgdG8gYHRydWVgIGlmIHlvdSdyZSBvbiBXaW5kb3dzIEF6dXJlLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIGVuY3J5cHQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBCeSBkZWZhdWx0LCBpZiB0aGUgZGF0YWJhc2UgcmVxdWVzdGVkIGJ5IFtbZGF0YWJhc2VdXSBjYW5ub3QgYmUgYWNjZXNzZWQsXG4gICAqIHRoZSBjb25uZWN0aW9uIHdpbGwgZmFpbCB3aXRoIGFuIGVycm9yLiBIb3dldmVyLCBpZiBbW2ZhbGxiYWNrVG9EZWZhdWx0RGJdXSBpc1xuICAgKiBzZXQgdG8gYHRydWVgLCB0aGVuIHRoZSB1c2VyJ3MgZGVmYXVsdCBkYXRhYmFzZSB3aWxsIGJlIHVzZWQgaW5zdGVhZFxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIGZhbGxiYWNrVG9EZWZhdWx0RGI/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgaW5zdGFuY2UgbmFtZSB0byBjb25uZWN0IHRvLlxuICAgKiBUaGUgU1FMIFNlcnZlciBCcm93c2VyIHNlcnZpY2UgbXVzdCBiZSBydW5uaW5nIG9uIHRoZSBkYXRhYmFzZSBzZXJ2ZXIsXG4gICAqIGFuZCBVRFAgcG9ydCAxNDM0IG9uIHRoZSBkYXRhYmFzZSBzZXJ2ZXIgbXVzdCBiZSByZWFjaGFibGUuXG4gICAqXG4gICAqIChubyBkZWZhdWx0KVxuICAgKlxuICAgKiBNdXR1YWxseSBleGNsdXNpdmUgd2l0aCBbW3BvcnRdXS5cbiAgICovXG4gIGluc3RhbmNlTmFtZT86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogVGhlIGRlZmF1bHQgaXNvbGF0aW9uIGxldmVsIHRoYXQgdHJhbnNhY3Rpb25zIHdpbGwgYmUgcnVuIHdpdGguXG4gICAqXG4gICAqIFRoZSBpc29sYXRpb24gbGV2ZWxzIGFyZSBhdmFpbGFibGUgZnJvbSBgcmVxdWlyZSgndGVkaW91cycpLklTT0xBVElPTl9MRVZFTGAuXG4gICAqICogYFJFQURfVU5DT01NSVRURURgXG4gICAqICogYFJFQURfQ09NTUlUVEVEYFxuICAgKiAqIGBSRVBFQVRBQkxFX1JFQURgXG4gICAqICogYFNFUklBTElaQUJMRWBcbiAgICogKiBgU05BUFNIT1RgXG4gICAqXG4gICAqIChkZWZhdWx0OiBgUkVBRF9DT01NSVRFRGApLlxuICAgKi9cbiAgaXNvbGF0aW9uTGV2ZWw/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFNwZWNpZmllcyB0aGUgbGFuZ3VhZ2UgZW52aXJvbm1lbnQgZm9yIHRoZSBzZXNzaW9uLiBUaGUgc2Vzc2lvbiBsYW5ndWFnZSBkZXRlcm1pbmVzIHRoZSBkYXRldGltZSBmb3JtYXRzIGFuZCBzeXN0ZW0gbWVzc2FnZXMuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdXNfZW5nbGlzaGApLlxuICAgKi9cbiAgbGFuZ3VhZ2U/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEEgc3RyaW5nIGluZGljYXRpbmcgd2hpY2ggbmV0d29yayBpbnRlcmZhY2UgKGlwIGFkZHJlc3MpIHRvIHVzZSB3aGVuIGNvbm5lY3RpbmcgdG8gU1FMIFNlcnZlci5cbiAgICovXG4gIGxvY2FsQWRkcmVzcz86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQSBib29sZWFuIGRldGVybWluaW5nIHdoZXRoZXIgdG8gcGFyc2UgdW5pcXVlIGlkZW50aWZpZXIgdHlwZSB3aXRoIGxvd2VyY2FzZSBjYXNlIGNoYXJhY3RlcnMuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICovXG4gIGxvd2VyQ2FzZUd1aWRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIG1heGltdW0gbnVtYmVyIG9mIGNvbm5lY3Rpb24gcmV0cmllcyBmb3IgdHJhbnNpZW50IGVycm9ycy7jgIFcbiAgICpcbiAgICogKGRlZmF1bHQ6IGAzYCkuXG4gICAqL1xuICBtYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnM/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIE11bHRpU3VibmV0RmFpbG92ZXIgPSBUcnVlIHBhcmFtZXRlciwgd2hpY2ggY2FuIGhlbHAgbWluaW1pemUgdGhlIGNsaWVudCByZWNvdmVyeSBsYXRlbmN5IHdoZW4gZmFpbG92ZXJzIG9jY3VyLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYCkuXG4gICAqL1xuICBtdWx0aVN1Ym5ldEZhaWxvdmVyPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIHNpemUgb2YgVERTIHBhY2tldHMgKHN1YmplY3QgdG8gbmVnb3RpYXRpb24gd2l0aCB0aGUgc2VydmVyKS5cbiAgICogU2hvdWxkIGJlIGEgcG93ZXIgb2YgMi5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGA0MDk2YCkuXG4gICAqL1xuICBwYWNrZXRTaXplPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBQb3J0IHRvIGNvbm5lY3QgdG8gKGRlZmF1bHQ6IGAxNDMzYCkuXG4gICAqXG4gICAqIE11dHVhbGx5IGV4Y2x1c2l2ZSB3aXRoIFtbaW5zdGFuY2VOYW1lXV1cbiAgICovXG4gIHBvcnQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgZGV0ZXJtaW5pbmcgd2hldGhlciB0aGUgY29ubmVjdGlvbiB3aWxsIHJlcXVlc3QgcmVhZCBvbmx5IGFjY2VzcyBmcm9tIGEgU1FMIFNlcnZlciBBdmFpbGFiaWxpdHlcbiAgICogR3JvdXAuIEZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWUgW2hlcmVdKGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9oaDcxMDA1NC5hc3B4IFwiTWljcm9zb2Z0OiBDb25maWd1cmUgUmVhZC1Pbmx5IFJvdXRpbmcgZm9yIGFuIEF2YWlsYWJpbGl0eSBHcm91cCAoU1FMIFNlcnZlcilcIilcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApLlxuICAgKi9cbiAgcmVhZE9ubHlJbnRlbnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZWZvcmUgYSByZXF1ZXN0IGlzIGNvbnNpZGVyZWQgZmFpbGVkLCBvciBgMGAgZm9yIG5vIHRpbWVvdXRcbiAgICpcbiAgICogKGRlZmF1bHQ6IGAxNTAwMGApLlxuICAgKi9cbiAgcmVxdWVzdFRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgdGhhdCB3aGVuIHRydWUgd2lsbCBleHBvc2UgcmVjZWl2ZWQgcm93cyBpbiBSZXF1ZXN0cyBkb25lIHJlbGF0ZWQgZXZlbnRzOlxuICAgKiAqIFtbUmVxdWVzdC5FdmVudF9kb25lSW5Qcm9jXV1cbiAgICogKiBbW1JlcXVlc3QuRXZlbnRfZG9uZVByb2NdXVxuICAgKiAqIFtbUmVxdWVzdC5FdmVudF9kb25lXV1cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqXG4gICAqIENhdXRpb246IElmIG1hbnkgcm93IGFyZSByZWNlaXZlZCwgZW5hYmxpbmcgdGhpcyBvcHRpb24gY291bGQgcmVzdWx0IGluXG4gICAqIGV4Y2Vzc2l2ZSBtZW1vcnkgdXNhZ2UuXG4gICAqL1xuICByb3dDb2xsZWN0aW9uT25Eb25lPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQSBib29sZWFuLCB0aGF0IHdoZW4gdHJ1ZSB3aWxsIGV4cG9zZSByZWNlaXZlZCByb3dzIGluIFJlcXVlc3RzJyBjb21wbGV0aW9uIGNhbGxiYWNrLlNlZSBbW1JlcXVlc3QuY29uc3RydWN0b3JdXS5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqXG4gICAqIENhdXRpb246IElmIG1hbnkgcm93IGFyZSByZWNlaXZlZCwgZW5hYmxpbmcgdGhpcyBvcHRpb24gY291bGQgcmVzdWx0IGluXG4gICAqIGV4Y2Vzc2l2ZSBtZW1vcnkgdXNhZ2UuXG4gICAqL1xuICByb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSB2ZXJzaW9uIG9mIFREUyB0byB1c2UuIElmIHNlcnZlciBkb2Vzbid0IHN1cHBvcnQgc3BlY2lmaWVkIHZlcnNpb24sIG5lZ290aWF0ZWQgdmVyc2lvbiBpcyB1c2VkIGluc3RlYWQuXG4gICAqXG4gICAqIFRoZSB2ZXJzaW9ucyBhcmUgYXZhaWxhYmxlIGZyb20gYHJlcXVpcmUoJ3RlZGlvdXMnKS5URFNfVkVSU0lPTmAuXG4gICAqICogYDdfMWBcbiAgICogKiBgN18yYFxuICAgKiAqIGA3XzNfQWBcbiAgICogKiBgN18zX0JgXG4gICAqICogYDdfNGBcbiAgICpcbiAgICogKGRlZmF1bHQ6IGA3XzRgKVxuICAgKi9cbiAgdGRzVmVyc2lvbj86IHN0cmluZztcblxuICAvKipcbiAgICogU3BlY2lmaWVzIHRoZSBzaXplIG9mIHZhcmNoYXIobWF4KSwgbnZhcmNoYXIobWF4KSwgdmFyYmluYXJ5KG1heCksIHRleHQsIG50ZXh0LCBhbmQgaW1hZ2UgZGF0YSByZXR1cm5lZCBieSBhIFNFTEVDVCBzdGF0ZW1lbnQuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgMjE0NzQ4MzY0N2ApXG4gICAqL1xuICB0ZXh0c2l6ZT86IHN0cmluZztcblxuICAvKipcbiAgICogSWYgXCJ0cnVlXCIsIHRoZSBTUUwgU2VydmVyIFNTTCBjZXJ0aWZpY2F0ZSBpcyBhdXRvbWF0aWNhbGx5IHRydXN0ZWQgd2hlbiB0aGUgY29tbXVuaWNhdGlvbiBsYXllciBpcyBlbmNyeXB0ZWQgdXNpbmcgU1NMLlxuICAgKlxuICAgKiBJZiBcImZhbHNlXCIsIHRoZSBTUUwgU2VydmVyIHZhbGlkYXRlcyB0aGUgc2VydmVyIFNTTCBjZXJ0aWZpY2F0ZS4gSWYgdGhlIHNlcnZlciBjZXJ0aWZpY2F0ZSB2YWxpZGF0aW9uIGZhaWxzLFxuICAgKiB0aGUgZHJpdmVyIHJhaXNlcyBhbiBlcnJvciBhbmQgdGVybWluYXRlcyB0aGUgY29ubmVjdGlvbi4gTWFrZSBzdXJlIHRoZSB2YWx1ZSBwYXNzZWQgdG8gc2VydmVyTmFtZSBleGFjdGx5XG4gICAqIG1hdGNoZXMgdGhlIENvbW1vbiBOYW1lIChDTikgb3IgRE5TIG5hbWUgaW4gdGhlIFN1YmplY3QgQWx0ZXJuYXRlIE5hbWUgaW4gdGhlIHNlcnZlciBjZXJ0aWZpY2F0ZSBmb3IgYW4gU1NMIGNvbm5lY3Rpb24gdG8gc3VjY2VlZC5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHRydXN0U2VydmVyQ2VydGlmaWNhdGU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byByZXR1cm4gcm93cyBhcyBhcnJheXMgb3Iga2V5LXZhbHVlIGNvbGxlY3Rpb25zLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYCkuXG4gICAqL1xuICB1c2VDb2x1bW5OYW1lcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIHBhc3MgdGltZSB2YWx1ZXMgaW4gVVRDIG9yIGxvY2FsIHRpbWUuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApLlxuICAgKi9cbiAgdXNlVVRDPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIHdvcmtzdGF0aW9uIElEIChXU0lEKSBvZiB0aGUgY2xpZW50LCBkZWZhdWx0IG9zLmhvc3RuYW1lKCkuXG4gICAqIFVzZWQgZm9yIGlkZW50aWZ5aW5nIGEgc3BlY2lmaWMgY2xpZW50IGluIHByb2ZpbGluZywgbG9nZ2luZyBvclxuICAgKiB0cmFjaW5nIGNsaWVudCBhY3Rpdml0eSBpbiBTUUxTZXJ2ZXIuXG4gICAqXG4gICAqIFRoZSB2YWx1ZSBpcyByZXBvcnRlZCBieSB0aGUgVFNRTCBmdW5jdGlvbiBIT1NUX05BTUUoKS5cbiAgICovXG4gIHdvcmtzdGF0aW9uSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgQ0xFQU5VUF9UWVBFID0ge1xuICBOT1JNQUw6IDAsXG4gIFJFRElSRUNUOiAxLFxuICBSRVRSWTogMlxufTtcblxuaW50ZXJmYWNlIFJvdXRpbmdEYXRhIHtcbiAgc2VydmVyOiBzdHJpbmc7XG4gIHBvcnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBBIFtbQ29ubmVjdGlvbl1dIGluc3RhbmNlIHJlcHJlc2VudHMgYSBzaW5nbGUgY29ubmVjdGlvbiB0byBhIGRhdGFiYXNlIHNlcnZlci5cbiAqXG4gKiBgYGBqc1xuICogdmFyIENvbm5lY3Rpb24gPSByZXF1aXJlKCd0ZWRpb3VzJykuQ29ubmVjdGlvbjtcbiAqIHZhciBjb25maWcgPSB7XG4gKiAgXCJhdXRoZW50aWNhdGlvblwiOiB7XG4gKiAgICAuLi4sXG4gKiAgICBcIm9wdGlvbnNcIjogey4uLn1cbiAqICB9LFxuICogIFwib3B0aW9uc1wiOiB7Li4ufVxuICogfTtcbiAqIHZhciBjb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oY29uZmlnKTtcbiAqIGBgYFxuICpcbiAqIE9ubHkgb25lIHJlcXVlc3QgYXQgYSB0aW1lIG1heSBiZSBleGVjdXRlZCBvbiBhIGNvbm5lY3Rpb24uIE9uY2UgYSBbW1JlcXVlc3RdXVxuICogaGFzIGJlZW4gaW5pdGlhdGVkICh3aXRoIFtbQ29ubmVjdGlvbi5jYWxsUHJvY2VkdXJlXV0sIFtbQ29ubmVjdGlvbi5leGVjU3FsXV0sXG4gKiBvciBbW0Nvbm5lY3Rpb24uZXhlY1NxbEJhdGNoXV0pLCBhbm90aGVyIHNob3VsZCBub3QgYmUgaW5pdGlhdGVkIHVudGlsIHRoZVxuICogW1tSZXF1ZXN0XV0ncyBjb21wbGV0aW9uIGNhbGxiYWNrIGlzIGNhbGxlZC5cbiAqL1xuY2xhc3MgQ29ubmVjdGlvbiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZmVkQXV0aFJlcXVpcmVkOiBib29sZWFuO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNvbmZpZzogSW50ZXJuYWxDb25uZWN0aW9uQ29uZmlnO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHNlY3VyZUNvbnRleHRPcHRpb25zOiBTZWN1cmVDb250ZXh0T3B0aW9ucztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBpblRyYW5zYWN0aW9uOiBib29sZWFuO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHRyYW5zYWN0aW9uRGVzY3JpcHRvcnM6IEJ1ZmZlcltdO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHRyYW5zYWN0aW9uRGVwdGg6IG51bWJlcjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBpc1NxbEJhdGNoOiBib29sZWFuO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGN1clRyYW5zaWVudFJldHJ5Q291bnQ6IG51bWJlcjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICB0cmFuc2llbnRFcnJvckxvb2t1cDogVHJhbnNpZW50RXJyb3JMb29rdXA7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xvc2VkOiBib29sZWFuO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGxvZ2luRXJyb3I6IHVuZGVmaW5lZCB8IEFnZ3JlZ2F0ZUVycm9yIHwgQ29ubmVjdGlvbkVycm9yO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlYnVnOiBEZWJ1ZztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBudGxtcGFja2V0OiB1bmRlZmluZWQgfCBhbnk7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgbnRsbXBhY2tldEJ1ZmZlcjogdW5kZWZpbmVkIHwgQnVmZmVyO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBTVEFURToge1xuICAgIElOSVRJQUxJWkVEOiBTdGF0ZTtcbiAgICBDT05ORUNUSU5HOiBTdGF0ZTtcbiAgICBTRU5UX1BSRUxPR0lOOiBTdGF0ZTtcbiAgICBSRVJPVVRJTkc6IFN0YXRlO1xuICAgIFRSQU5TSUVOVF9GQUlMVVJFX1JFVFJZOiBTdGF0ZTtcbiAgICBTRU5UX1RMU1NTTE5FR09USUFUSU9OOiBTdGF0ZTtcbiAgICBTRU5UX0xPR0lON19XSVRIX1NUQU5EQVJEX0xPR0lOOiBTdGF0ZTtcbiAgICBTRU5UX0xPR0lON19XSVRIX05UTE06IFN0YXRlO1xuICAgIFNFTlRfTE9HSU43X1dJVEhfRkVEQVVUSDogU3RhdGU7XG4gICAgTE9HR0VEX0lOX1NFTkRJTkdfSU5JVElBTF9TUUw6IFN0YXRlO1xuICAgIExPR0dFRF9JTjogU3RhdGU7XG4gICAgU0VOVF9DTElFTlRfUkVRVUVTVDogU3RhdGU7XG4gICAgU0VOVF9BVFRFTlRJT046IFN0YXRlO1xuICAgIEZJTkFMOiBTdGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcm91dGluZ0RhdGE6IHVuZGVmaW5lZCB8IFJvdXRpbmdEYXRhO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgbWVzc2FnZUlvITogTWVzc2FnZUlPO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHN0YXRlOiBTdGF0ZTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICByZXNldENvbm5lY3Rpb25Pbk5leHRSZXF1ZXN0OiB1bmRlZmluZWQgfCBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcmVxdWVzdDogdW5kZWZpbmVkIHwgUmVxdWVzdCB8IEJ1bGtMb2FkO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHByb2NSZXR1cm5TdGF0dXNWYWx1ZTogdW5kZWZpbmVkIHwgYW55O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHNvY2tldDogdW5kZWZpbmVkIHwgU29ja2V0O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIG1lc3NhZ2VCdWZmZXI6IEJ1ZmZlcjtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNvbm5lY3RUaW1lcjogdW5kZWZpbmVkIHwgTm9kZUpTLlRpbWVvdXQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2FuY2VsVGltZXI6IHVuZGVmaW5lZCB8IE5vZGVKUy5UaW1lb3V0O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHJlcXVlc3RUaW1lcjogdW5kZWZpbmVkIHwgTm9kZUpTLlRpbWVvdXQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcmV0cnlUaW1lcjogdW5kZWZpbmVkIHwgTm9kZUpTLlRpbWVvdXQ7XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2FuY2VsQWZ0ZXJSZXF1ZXN0U2VudDogKCkgPT4gdm9pZDtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRhdGFiYXNlQ29sbGF0aW9uOiBDb2xsYXRpb24gfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIE5vdGU6IGJlIGF3YXJlIG9mIHRoZSBkaWZmZXJlbnQgb3B0aW9ucyBmaWVsZDpcbiAgICogMS4gY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnNcbiAgICogMi4gY29uZmlnLm9wdGlvbnNcbiAgICpcbiAgICogYGBganNcbiAgICogY29uc3QgeyBDb25uZWN0aW9uIH0gPSByZXF1aXJlKCd0ZWRpb3VzJyk7XG4gICAqXG4gICAqIGNvbnN0IGNvbmZpZyA9IHtcbiAgICogIFwiYXV0aGVudGljYXRpb25cIjoge1xuICAgKiAgICAuLi4sXG4gICAqICAgIFwib3B0aW9uc1wiOiB7Li4ufVxuICAgKiAgfSxcbiAgICogIFwib3B0aW9uc1wiOiB7Li4ufVxuICAgKiB9O1xuICAgKlxuICAgKiBjb25zdCBjb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oY29uZmlnKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBjb25maWdcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogQ29ubmVjdGlvbkNvbmZpZ3VyYXRpb24pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgaWYgKHR5cGVvZiBjb25maWcgIT09ICdvYmplY3QnIHx8IGNvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnXCIgYXJndW1lbnQgaXMgcmVxdWlyZWQgYW5kIG11c3QgYmUgb2YgdHlwZSBPYmplY3QuJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjb25maWcuc2VydmVyICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLnNlcnZlclwiIHByb3BlcnR5IGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgIH1cblxuICAgIHRoaXMuZmVkQXV0aFJlcXVpcmVkID0gZmFsc2U7XG5cbiAgICBsZXQgYXV0aGVudGljYXRpb246IEludGVybmFsQ29ubmVjdGlvbkNvbmZpZ1snYXV0aGVudGljYXRpb24nXTtcbiAgICBpZiAoY29uZmlnLmF1dGhlbnRpY2F0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgY29uZmlnLmF1dGhlbnRpY2F0aW9uICE9PSAnb2JqZWN0JyB8fCBjb25maWcuYXV0aGVudGljYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIE9iamVjdC4nKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdHlwZSA9IGNvbmZpZy5hdXRoZW50aWNhdGlvbi50eXBlO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IGNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zID09PSB1bmRlZmluZWQgPyB7fSA6IGNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zO1xuXG4gICAgICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi50eXBlXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0JyAmJiB0eXBlICE9PSAnbnRsbScgJiYgdHlwZSAhPT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmQnICYmIHR5cGUgIT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbicgJiYgdHlwZSAhPT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJyAmJiB0eXBlICE9PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnICYmIHR5cGUgIT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCcgJiYgdHlwZSAhPT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwidHlwZVwiIHByb3BlcnR5IG11c3Qgb25lIG9mIFwiZGVmYXVsdFwiLCBcIm50bG1cIiwgXCJhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkXCIsIFwiYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW5cIiwgXCJhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHRcIiwgXCJhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bVwiIG9yIFwiYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2VcIiBvciBcImF6dXJlLWFjdGl2ZS1kaXJlY3Rvcnktc2VydmljZS1wcmluY2lwYWwtc2VjcmV0XCIuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcgfHwgb3B0aW9ucyA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9uc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBvYmplY3QuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlID09PSAnbnRsbScpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmRvbWFpbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5kb21haW5cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMudXNlck5hbWUgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy51c2VyTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy51c2VyTmFtZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5wYXNzd29yZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnBhc3N3b3JkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnBhc3N3b3JkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdudGxtJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB1c2VyTmFtZTogb3B0aW9ucy51c2VyTmFtZSxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBvcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgZG9tYWluOiBvcHRpb25zLmRvbWFpbiAmJiBvcHRpb25zLmRvbWFpbi50b1VwcGVyQ2FzZSgpXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNsaWVudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnVzZXJOYW1lICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMudXNlck5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudXNlck5hbWVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMucGFzc3dvcmQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5wYXNzd29yZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5wYXNzd29yZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy50ZW5hbnRJZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnRlbmFudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnRlbmFudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB1c2VyTmFtZTogb3B0aW9ucy51c2VyTmFtZSxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBvcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgdGVuYW50SWQ6IG9wdGlvbnMudGVuYW50SWQsXG4gICAgICAgICAgICBjbGllbnRJZDogb3B0aW9ucy5jbGllbnRJZFxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuJykge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9rZW4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudG9rZW5cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB0b2tlbjogb3B0aW9ucy50b2tlblxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJykge1xuICAgICAgICBpZiAob3B0aW9ucy5jbGllbnRJZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmNsaWVudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bScsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgY2xpZW50SWQ6IG9wdGlvbnMuY2xpZW50SWRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNsaWVudElkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuY2xpZW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGNsaWVudElkOiBvcHRpb25zLmNsaWVudElkXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNsaWVudElkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuY2xpZW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBjbGllbnRJZDogb3B0aW9ucy5jbGllbnRJZFxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3Rvcnktc2VydmljZS1wcmluY2lwYWwtc2VjcmV0Jykge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2xpZW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNsaWVudFNlY3JldCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRTZWNyZXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnRlbmFudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnRlbmFudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCcsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgY2xpZW50SWQ6IG9wdGlvbnMuY2xpZW50SWQsXG4gICAgICAgICAgICBjbGllbnRTZWNyZXQ6IG9wdGlvbnMuY2xpZW50U2VjcmV0LFxuICAgICAgICAgICAgdGVuYW50SWQ6IG9wdGlvbnMudGVuYW50SWRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAob3B0aW9ucy51c2VyTmFtZSAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnVzZXJOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnVzZXJOYW1lXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnBhc3N3b3JkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMucGFzc3dvcmQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMucGFzc3dvcmRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2RlZmF1bHQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHVzZXJOYW1lOiBvcHRpb25zLnVzZXJOYW1lLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IG9wdGlvbnMucGFzc3dvcmRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICB0eXBlOiAnZGVmYXVsdCcsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICB1c2VyTmFtZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHBhc3N3b3JkOiB1bmRlZmluZWRcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbmZpZyA9IHtcbiAgICAgIHNlcnZlcjogY29uZmlnLnNlcnZlcixcbiAgICAgIGF1dGhlbnRpY2F0aW9uOiBhdXRoZW50aWNhdGlvbixcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3I6IGZhbHNlLFxuICAgICAgICBhcHBOYW1lOiB1bmRlZmluZWQsXG4gICAgICAgIGNhbWVsQ2FzZUNvbHVtbnM6IGZhbHNlLFxuICAgICAgICBjYW5jZWxUaW1lb3V0OiBERUZBVUxUX0NBTkNFTF9USU1FT1VULFxuICAgICAgICBjb2x1bW5FbmNyeXB0aW9uS2V5Q2FjaGVUVEw6IDIgKiA2MCAqIDYwICogMTAwMCwgIC8vIFVuaXRzOiBtaWxpc2Vjb25kc1xuICAgICAgICBjb2x1bW5FbmNyeXB0aW9uU2V0dGluZzogZmFsc2UsXG4gICAgICAgIGNvbHVtbk5hbWVSZXBsYWNlcjogdW5kZWZpbmVkLFxuICAgICAgICBjb25uZWN0aW9uUmV0cnlJbnRlcnZhbDogREVGQVVMVF9DT05ORUNUX1JFVFJZX0lOVEVSVkFMLFxuICAgICAgICBjb25uZWN0VGltZW91dDogREVGQVVMVF9DT05ORUNUX1RJTUVPVVQsXG4gICAgICAgIGNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbDogSVNPTEFUSU9OX0xFVkVMLlJFQURfQ09NTUlUVEVELFxuICAgICAgICBjcnlwdG9DcmVkZW50aWFsc0RldGFpbHM6IHt9LFxuICAgICAgICBkYXRhYmFzZTogdW5kZWZpbmVkLFxuICAgICAgICBkYXRlZmlyc3Q6IERFRkFVTFRfREFURUZJUlNULFxuICAgICAgICBkYXRlRm9ybWF0OiBERUZBVUxUX0RBVEVGT1JNQVQsXG4gICAgICAgIGRlYnVnOiB7XG4gICAgICAgICAgZGF0YTogZmFsc2UsXG4gICAgICAgICAgcGFja2V0OiBmYWxzZSxcbiAgICAgICAgICBwYXlsb2FkOiBmYWxzZSxcbiAgICAgICAgICB0b2tlbjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgZW5hYmxlQW5zaU51bGw6IHRydWUsXG4gICAgICAgIGVuYWJsZUFuc2lOdWxsRGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQW5zaVBhZGRpbmc6IHRydWUsXG4gICAgICAgIGVuYWJsZUFuc2lXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQXJpdGhBYm9ydDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGw6IHRydWUsXG4gICAgICAgIGVuYWJsZUN1cnNvckNsb3NlT25Db21taXQ6IG51bGwsXG4gICAgICAgIGVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zOiBmYWxzZSxcbiAgICAgICAgZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ6IGZhbHNlLFxuICAgICAgICBlbmFibGVRdW90ZWRJZGVudGlmaWVyOiB0cnVlLFxuICAgICAgICBlbmNyeXB0OiB0cnVlLFxuICAgICAgICBmYWxsYmFja1RvRGVmYXVsdERiOiBmYWxzZSxcbiAgICAgICAgZW5jcnlwdGlvbktleVN0b3JlUHJvdmlkZXJzOiB1bmRlZmluZWQsXG4gICAgICAgIGluc3RhbmNlTmFtZTogdW5kZWZpbmVkLFxuICAgICAgICBpc29sYXRpb25MZXZlbDogSVNPTEFUSU9OX0xFVkVMLlJFQURfQ09NTUlUVEVELFxuICAgICAgICBsYW5ndWFnZTogREVGQVVMVF9MQU5HVUFHRSxcbiAgICAgICAgbG9jYWxBZGRyZXNzOiB1bmRlZmluZWQsXG4gICAgICAgIG1heFJldHJpZXNPblRyYW5zaWVudEVycm9yczogMyxcbiAgICAgICAgbXVsdGlTdWJuZXRGYWlsb3ZlcjogZmFsc2UsXG4gICAgICAgIHBhY2tldFNpemU6IERFRkFVTFRfUEFDS0VUX1NJWkUsXG4gICAgICAgIHBvcnQ6IERFRkFVTFRfUE9SVCxcbiAgICAgICAgcmVhZE9ubHlJbnRlbnQ6IGZhbHNlLFxuICAgICAgICByZXF1ZXN0VGltZW91dDogREVGQVVMVF9DTElFTlRfUkVRVUVTVF9USU1FT1VULFxuICAgICAgICByb3dDb2xsZWN0aW9uT25Eb25lOiBmYWxzZSxcbiAgICAgICAgcm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgICBzZXJ2ZXJOYW1lOiB1bmRlZmluZWQsXG4gICAgICAgIHNlcnZlclN1cHBvcnRzQ29sdW1uRW5jcnlwdGlvbjogZmFsc2UsXG4gICAgICAgIHRkc1ZlcnNpb246IERFRkFVTFRfVERTX1ZFUlNJT04sXG4gICAgICAgIHRleHRzaXplOiBERUZBVUxUX1RFWFRTSVpFLFxuICAgICAgICB0cnVzdGVkU2VydmVyTmFtZUFFOiB1bmRlZmluZWQsXG4gICAgICAgIHRydXN0U2VydmVyQ2VydGlmaWNhdGU6IGZhbHNlLFxuICAgICAgICB1c2VDb2x1bW5OYW1lczogZmFsc2UsXG4gICAgICAgIHVzZVVUQzogdHJ1ZSxcbiAgICAgICAgd29ya3N0YXRpb25JZDogdW5kZWZpbmVkLFxuICAgICAgICBsb3dlckNhc2VHdWlkczogZmFsc2VcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGNvbmZpZy5vcHRpb25zKSB7XG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucG9ydCAmJiBjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQb3J0IGFuZCBpbnN0YW5jZU5hbWUgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZSwgYnV0ICcgKyBjb25maWcub3B0aW9ucy5wb3J0ICsgJyBhbmQgJyArIGNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSArICcgcHJvdmlkZWQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5hYm9ydFRyYW5zYWN0aW9uT25FcnJvciAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3JcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yID0gY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3I7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5hcHBOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5hcHBOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmFwcE5hbWVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5hcHBOYW1lID0gY29uZmlnLm9wdGlvbnMuYXBwTmFtZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnMgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuY2FtZWxDYXNlQ29sdW1ucyA9IGNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0ID0gY29uZmlnLm9wdGlvbnMuY2FuY2VsVGltZW91dDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlcikge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgZnVuY3Rpb24uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlciA9IGNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFzc2VydFZhbGlkSXNvbGF0aW9uTGV2ZWwoY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsLCAnY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsJyk7XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWwgPSBjb25maWcub3B0aW9ucy5jb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWw7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dCA9IGNvbmZpZy5vcHRpb25zLmNvbm5lY3RUaW1lb3V0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHMgIT09ICdvYmplY3QnIHx8IGNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlsc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBPYmplY3QuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscyA9IGNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRhdGFiYXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kYXRhYmFzZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5kYXRhYmFzZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGFiYXNlID0gY29uZmlnLm9wdGlvbnMuZGF0YWJhc2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5kYXRlZmlyc3QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCAhPT0gJ251bWJlcicgJiYgY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5kYXRlZmlyc3QgIT09IG51bGwgJiYgKGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCA8IDEgfHwgY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0ID4gNykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0XCIgcHJvcGVydHkgbXVzdCBiZSA+PSAxIGFuZCA8PSA3Jyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCA9IGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQgIT09ICdzdHJpbmcnICYmIGNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5kYXRlRm9ybWF0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZyBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kYXRlRm9ybWF0ID0gY29uZmlnLm9wdGlvbnMuZGF0ZUZvcm1hdDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRlYnVnKSB7XG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5kZWJ1Zy5kYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRlYnVnLmRhdGEgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGVidWcuZGF0YVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZGVidWcuZGF0YSA9IGNvbmZpZy5vcHRpb25zLmRlYnVnLmRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGVidWcucGFja2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRlYnVnLnBhY2tldCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5kZWJ1Zy5wYWNrZXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRlYnVnLnBhY2tldCA9IGNvbmZpZy5vcHRpb25zLmRlYnVnLnBhY2tldDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5kZWJ1Zy5wYXlsb2FkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRlYnVnLnBheWxvYWQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGVidWcucGF5bG9hZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZGVidWcucGF5bG9hZCA9IGNvbmZpZy5vcHRpb25zLmRlYnVnLnBheWxvYWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGVidWcudG9rZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZGVidWcudG9rZW4gIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGVidWcudG9rZW5cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuID0gY29uZmlnLm9wdGlvbnMuZGVidWcudG9rZW47XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCA9IGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgPSBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmcgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZyAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmcgPSBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVBcml0aEFib3J0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCA9IGNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVDb25jYXROdWxsWWllbGRzTnVsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVDb25jYXROdWxsWWllbGRzTnVsbCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgPSBjb25maWcub3B0aW9ucy5lbmFibGVDb25jYXROdWxsWWllbGRzTnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUN1cnNvckNsb3NlT25Db21taXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUN1cnNvckNsb3NlT25Db21taXQgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUN1cnNvckNsb3NlT25Db21taXQgPSBjb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnMgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9uc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVOdW1lcmljUm91bmRhYm9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVOdW1lcmljUm91bmRhYm9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZU51bWVyaWNSb3VuZGFib3J0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgPSBjb25maWcub3B0aW9ucy5lbmFibGVOdW1lcmljUm91bmRhYm9ydDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZVF1b3RlZElkZW50aWZpZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZVF1b3RlZElkZW50aWZpZXIgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllclwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZVF1b3RlZElkZW50aWZpZXIgPSBjb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5jcnlwdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5jcnlwdCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5jcnlwdFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmNyeXB0ID0gY29uZmlnLm9wdGlvbnMuZW5jcnlwdDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGIgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGJcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZmFsbGJhY2tUb0RlZmF1bHREYiA9IGNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGI7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUgPSBjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWU7XG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmlzb2xhdGlvbkxldmVsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYXNzZXJ0VmFsaWRJc29sYXRpb25MZXZlbChjb25maWcub3B0aW9ucy5pc29sYXRpb25MZXZlbCwgJ2NvbmZpZy5vcHRpb25zLmlzb2xhdGlvbkxldmVsJyk7XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5pc29sYXRpb25MZXZlbCA9IGNvbmZpZy5vcHRpb25zLmlzb2xhdGlvbkxldmVsO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMubGFuZ3VhZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmxhbmd1YWdlICE9PSAnc3RyaW5nJyAmJiBjb25maWcub3B0aW9ucy5sYW5ndWFnZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmxhbmd1YWdlXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZyBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5sYW5ndWFnZSA9IGNvbmZpZy5vcHRpb25zLmxhbmd1YWdlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5sb2NhbEFkZHJlc3MgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzID0gY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3ZlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3ZlciAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3ZlclwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyID0gY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3ZlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnBhY2tldFNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnBhY2tldFNpemUgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMucGFja2V0U2l6ZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnBhY2tldFNpemUgPSBjb25maWcub3B0aW9ucy5wYWNrZXRTaXplO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucG9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMucG9ydCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5wb3J0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5wb3J0IDw9IDAgfHwgY29uZmlnLm9wdGlvbnMucG9ydCA+PSA2NTUzNikge1xuICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5wb3J0XCIgcHJvcGVydHkgbXVzdCBiZSA+IDAgYW5kIDwgNjU1MzYnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCA9IGNvbmZpZy5vcHRpb25zLnBvcnQ7XG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucmVhZE9ubHlJbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnJlYWRPbmx5SW50ZW50ICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5yZWFkT25seUludGVudFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5yZWFkT25seUludGVudCA9IGNvbmZpZy5vcHRpb25zLnJlYWRPbmx5SW50ZW50O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucmVxdWVzdFRpbWVvdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnJlcXVlc3RUaW1lb3V0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnJlcXVlc3RUaW1lb3V0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucmVxdWVzdFRpbWVvdXQgPSBjb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMubWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9yc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMubWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzIDwgMCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9yc1wiIHByb3BlcnR5IG11c3QgYmUgZXF1YWwgb3IgZ3JlYXRlciB0aGFuIDAuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycyA9IGNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwgPD0gMCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsXCIgcHJvcGVydHkgbXVzdCBiZSBncmVhdGVyIHRoYW4gMC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwgPSBjb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uRG9uZSA9IGNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb24gIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uID0gY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb247XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy50ZHNWZXJzaW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy50ZHNWZXJzaW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb25cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy50ZHNWZXJzaW9uID0gY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnRleHRzaXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy50ZXh0c2l6ZSAhPT0gJ251bWJlcicgJiYgY29uZmlnLm9wdGlvbnMudGV4dHNpemUgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy50ZXh0c2l6ZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIgb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy50ZXh0c2l6ZSA+IDIxNDc0ODM2NDcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy50ZXh0c2l6ZVwiIGNhblxcJ3QgYmUgZ3JlYXRlciB0aGFuIDIxNDc0ODM2NDcuJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLm9wdGlvbnMudGV4dHNpemUgPCAtMSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnRleHRzaXplXCIgY2FuXFwndCBiZSBzbWFsbGVyIHRoYW4gLTEuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnRleHRzaXplID0gY29uZmlnLm9wdGlvbnMudGV4dHNpemUgfCAwO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy50cnVzdFNlcnZlckNlcnRpZmljYXRlID0gY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnVzZUNvbHVtbk5hbWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy51c2VDb2x1bW5OYW1lcyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMudXNlQ29sdW1uTmFtZXNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMudXNlQ29sdW1uTmFtZXMgPSBjb25maWcub3B0aW9ucy51c2VDb2x1bW5OYW1lcztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnVzZVVUQyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMudXNlVVRDICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy51c2VVVENcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMudXNlVVRDID0gY29uZmlnLm9wdGlvbnMudXNlVVRDO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy53b3Jrc3RhdGlvbklkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZCA9IGNvbmZpZy5vcHRpb25zLndvcmtzdGF0aW9uSWQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5sb3dlckNhc2VHdWlkcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMubG93ZXJDYXNlR3VpZHMgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmxvd2VyQ2FzZUd1aWRzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmxvd2VyQ2FzZUd1aWRzID0gY29uZmlnLm9wdGlvbnMubG93ZXJDYXNlR3VpZHM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zZWN1cmVDb250ZXh0T3B0aW9ucyA9IHRoaXMuY29uZmlnLm9wdGlvbnMuY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzO1xuICAgIGlmICh0aGlzLnNlY3VyZUNvbnRleHRPcHRpb25zLnNlY3VyZU9wdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gSWYgdGhlIGNhbGxlciBoYXMgbm90IHNwZWNpZmllZCB0aGVpciBvd24gYHNlY3VyZU9wdGlvbnNgLFxuICAgICAgLy8gd2Ugc2V0IGBTU0xfT1BfRE9OVF9JTlNFUlRfRU1QVFlfRlJBR01FTlRTYCBoZXJlLlxuICAgICAgLy8gT2xkZXIgU1FMIFNlcnZlciBpbnN0YW5jZXMgcnVubmluZyBvbiBvbGRlciBXaW5kb3dzIHZlcnNpb25zIGhhdmVcbiAgICAgIC8vIHRyb3VibGUgd2l0aCB0aGUgQkVBU1Qgd29ya2Fyb3VuZCBpbiBPcGVuU1NMLlxuICAgICAgLy8gQXMgQkVBU1QgaXMgYSBicm93c2VyIHNwZWNpZmljIGV4cGxvaXQsIHdlIGNhbiBqdXN0IGRpc2FibGUgdGhpcyBvcHRpb24gaGVyZS5cbiAgICAgIHRoaXMuc2VjdXJlQ29udGV4dE9wdGlvbnMgPSBPYmplY3QuY3JlYXRlKHRoaXMuc2VjdXJlQ29udGV4dE9wdGlvbnMsIHtcbiAgICAgICAgc2VjdXJlT3B0aW9uczoge1xuICAgICAgICAgIHZhbHVlOiBjb25zdGFudHMuU1NMX09QX0RPTlRfSU5TRVJUX0VNUFRZX0ZSQUdNRU5UU1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmRlYnVnID0gdGhpcy5jcmVhdGVEZWJ1ZygpO1xuICAgIHRoaXMuaW5UcmFuc2FjdGlvbiA9IGZhbHNlO1xuICAgIHRoaXMudHJhbnNhY3Rpb25EZXNjcmlwdG9ycyA9IFtCdWZmZXIuZnJvbShbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0pXTtcblxuICAgIC8vICdiZWdpblRyYW5zYWN0aW9uJywgJ2NvbW1pdFRyYW5zYWN0aW9uJyBhbmQgJ3JvbGxiYWNrVHJhbnNhY3Rpb24nXG4gICAgLy8gZXZlbnRzIGFyZSB1dGlsaXplZCB0byBtYWludGFpbiBpblRyYW5zYWN0aW9uIHByb3BlcnR5IHN0YXRlIHdoaWNoIGluXG4gICAgLy8gdHVybiBpcyB1c2VkIGluIG1hbmFnaW5nIHRyYW5zYWN0aW9ucy4gVGhlc2UgZXZlbnRzIGFyZSBvbmx5IGZpcmVkIGZvclxuICAgIC8vIFREUyB2ZXJzaW9uIDcuMiBhbmQgYmV5b25kLiBUaGUgcHJvcGVydGllcyBiZWxvdyBhcmUgdXNlZCB0byBlbXVsYXRlXG4gICAgLy8gZXF1aXZhbGVudCBiZWhhdmlvciBmb3IgVERTIHZlcnNpb25zIGJlZm9yZSA3LjIuXG4gICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoID0gMDtcbiAgICB0aGlzLmlzU3FsQmF0Y2ggPSBmYWxzZTtcbiAgICB0aGlzLmNsb3NlZCA9IGZhbHNlO1xuICAgIHRoaXMubWVzc2FnZUJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcblxuICAgIHRoaXMuY3VyVHJhbnNpZW50UmV0cnlDb3VudCA9IDA7XG4gICAgdGhpcy50cmFuc2llbnRFcnJvckxvb2t1cCA9IG5ldyBUcmFuc2llbnRFcnJvckxvb2t1cCgpO1xuXG4gICAgdGhpcy5zdGF0ZSA9IHRoaXMuU1RBVEUuSU5JVElBTElaRUQ7XG5cbiAgICB0aGlzLl9jYW5jZWxBZnRlclJlcXVlc3RTZW50ID0gKCkgPT4ge1xuICAgICAgdGhpcy5tZXNzYWdlSW8uc2VuZE1lc3NhZ2UoVFlQRS5BVFRFTlRJT04pO1xuICAgICAgdGhpcy5jcmVhdGVDYW5jZWxUaW1lcigpO1xuICAgIH07XG4gIH1cblxuICBjb25uZWN0KGNvbm5lY3RMaXN0ZW5lcj86IChlcnI/OiBFcnJvcikgPT4gdm9pZCkge1xuICAgIGlmICh0aGlzLnN0YXRlICE9PSB0aGlzLlNUQVRFLklOSVRJQUxJWkVEKSB7XG4gICAgICB0aHJvdyBuZXcgQ29ubmVjdGlvbkVycm9yKCdgLmNvbm5lY3RgIGNhbiBub3QgYmUgY2FsbGVkIG9uIGEgQ29ubmVjdGlvbiBpbiBgJyArIHRoaXMuc3RhdGUubmFtZSArICdgIHN0YXRlLicpO1xuICAgIH1cblxuICAgIGlmIChjb25uZWN0TGlzdGVuZXIpIHtcbiAgICAgIGNvbnN0IG9uQ29ubmVjdCA9IChlcnI/OiBFcnJvcikgPT4ge1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICBjb25uZWN0TGlzdGVuZXIoZXJyKTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IG9uRXJyb3IgPSAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0Jywgb25Db25uZWN0KTtcbiAgICAgICAgY29ubmVjdExpc3RlbmVyKGVycik7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLm9uY2UoJ2Nvbm5lY3QnLCBvbkNvbm5lY3QpO1xuICAgICAgdGhpcy5vbmNlKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIH1cblxuICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuQ09OTkVDVElORyk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHNlcnZlciBoYXMgcmVwb3J0ZWQgdGhhdCB0aGUgY2hhcnNldCBoYXMgY2hhbmdlZC5cbiAgICovXG4gIG9uKGV2ZW50OiAnY2hhcnNldENoYW5nZScsIGxpc3RlbmVyOiAoY2hhcnNldDogc3RyaW5nKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBUaGUgYXR0ZW1wdCB0byBjb25uZWN0IGFuZCB2YWxpZGF0ZSBoYXMgY29tcGxldGVkLlxuICAgKi9cbiAgb24oXG4gICAgZXZlbnQ6ICdjb25uZWN0JyxcbiAgICAvKipcbiAgICAgKiBAcGFyYW0gZXJyIElmIHN1Y2Nlc3NmdWxseSBjb25uZWN0ZWQsIHdpbGwgYmUgZmFsc2V5LiBJZiB0aGVyZSB3YXMgYVxuICAgICAqICAgcHJvYmxlbSAod2l0aCBlaXRoZXIgY29ubmVjdGluZyBvciB2YWxpZGF0aW9uKSwgd2lsbCBiZSBhbiBbW0Vycm9yXV0gb2JqZWN0LlxuICAgICAqL1xuICAgIGxpc3RlbmVyOiAoZXJyOiBFcnJvciB8IHVuZGVmaW5lZCkgPT4gdm9pZFxuICApOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBzZXJ2ZXIgaGFzIHJlcG9ydGVkIHRoYXQgdGhlIGFjdGl2ZSBkYXRhYmFzZSBoYXMgY2hhbmdlZC5cbiAgICogVGhpcyBtYXkgYmUgYXMgYSByZXN1bHQgb2YgYSBzdWNjZXNzZnVsIGxvZ2luLCBvciBhIGB1c2VgIHN0YXRlbWVudC5cbiAgICovXG4gIG9uKGV2ZW50OiAnZGF0YWJhc2VDaGFuZ2UnLCBsaXN0ZW5lcjogKGRhdGFiYXNlTmFtZTogc3RyaW5nKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBBIGRlYnVnIG1lc3NhZ2UgaXMgYXZhaWxhYmxlLiBJdCBtYXkgYmUgbG9nZ2VkIG9yIGlnbm9yZWQuXG4gICAqL1xuICBvbihldmVudDogJ2RlYnVnJywgbGlzdGVuZXI6IChtZXNzYWdlVGV4dDogc3RyaW5nKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBlcnJvciBvY2N1cnMuXG4gICAqL1xuICBvbihldmVudDogJ2Vycm9yJywgbGlzdGVuZXI6IChlcnI6IEVycm9yKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBUaGUgc2VydmVyIGhhcyBpc3N1ZWQgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICovXG4gIG9uKGV2ZW50OiAnZXJyb3JNZXNzYWdlJywgbGlzdGVuZXI6IChtZXNzYWdlOiBpbXBvcnQoJy4vdG9rZW4vdG9rZW4nKS5FcnJvck1lc3NhZ2VUb2tlbikgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIGNvbm5lY3Rpb24gaGFzIGVuZGVkLlxuICAgKlxuICAgKiBUaGlzIG1heSBiZSBhcyBhIHJlc3VsdCBvZiB0aGUgY2xpZW50IGNhbGxpbmcgW1tjbG9zZV1dLCB0aGUgc2VydmVyXG4gICAqIGNsb3NpbmcgdGhlIGNvbm5lY3Rpb24sIG9yIGEgbmV0d29yayBlcnJvci5cbiAgICovXG4gIG9uKGV2ZW50OiAnZW5kJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBzZXJ2ZXIgaGFzIGlzc3VlZCBhbiBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgKi9cbiAgb24oZXZlbnQ6ICdpbmZvTWVzc2FnZScsIGxpc3RlbmVyOiAobWVzc2FnZTogaW1wb3J0KCcuL3Rva2VuL3Rva2VuJykuSW5mb01lc3NhZ2VUb2tlbikgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIHNlcnZlciBoYXMgcmVwb3J0ZWQgdGhhdCB0aGUgbGFuZ3VhZ2UgaGFzIGNoYW5nZWQuXG4gICAqL1xuICBvbihldmVudDogJ2xhbmd1YWdlQ2hhbmdlJywgbGlzdGVuZXI6IChsYW5ndWFnZU5hbWU6IHN0cmluZykgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIGNvbm5lY3Rpb24gd2FzIHJlc2V0LlxuICAgKi9cbiAgb24oZXZlbnQ6ICdyZXNldENvbm5lY3Rpb24nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogQSBzZWN1cmUgY29ubmVjdGlvbiBoYXMgYmVlbiBlc3RhYmxpc2hlZC5cbiAgICovXG4gIG9uKGV2ZW50OiAnc2VjdXJlJywgbGlzdGVuZXI6IChjbGVhcnRleHQ6IGltcG9ydCgndGxzJykuVExTU29ja2V0KSA9PiB2b2lkKTogdGhpc1xuXG4gIG9uKGV2ZW50OiBzdHJpbmcgfCBzeW1ib2wsIGxpc3RlbmVyOiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcbiAgICByZXR1cm4gc3VwZXIub24oZXZlbnQsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ2NoYXJzZXRDaGFuZ2UnLCBjaGFyc2V0OiBzdHJpbmcpOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ2Nvbm5lY3QnLCBlcnJvcj86IEVycm9yKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdkYXRhYmFzZUNoYW5nZScsIGRhdGFiYXNlTmFtZTogc3RyaW5nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdkZWJ1ZycsIG1lc3NhZ2VUZXh0OiBzdHJpbmcpOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ2Vycm9yJywgZXJyb3I6IEVycm9yKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdlcnJvck1lc3NhZ2UnLCBtZXNzYWdlOiBpbXBvcnQoJy4vdG9rZW4vdG9rZW4nKS5FcnJvck1lc3NhZ2VUb2tlbik6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnZW5kJyk6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnaW5mb01lc3NhZ2UnLCBtZXNzYWdlOiBpbXBvcnQoJy4vdG9rZW4vdG9rZW4nKS5JbmZvTWVzc2FnZVRva2VuKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdsYW5ndWFnZUNoYW5nZScsIGxhbmd1YWdlTmFtZTogc3RyaW5nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdzZWN1cmUnLCBjbGVhcnRleHQ6IGltcG9ydCgndGxzJykuVExTU29ja2V0KTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyZXJvdXRpbmcnKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyZXNldENvbm5lY3Rpb24nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyZXRyeScpOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ3JvbGxiYWNrVHJhbnNhY3Rpb24nKTogYm9vbGVhblxuXG4gIGVtaXQoZXZlbnQ6IHN0cmluZyB8IHN5bWJvbCwgLi4uYXJnczogYW55W10pIHtcbiAgICByZXR1cm4gc3VwZXIuZW1pdChldmVudCwgLi4uYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBkYXRhYmFzZS5cbiAgICpcbiAgICogVGhlIFtbRXZlbnRfZW5kXV0gd2lsbCBiZSBlbWl0dGVkIG9uY2UgdGhlIGNvbm5lY3Rpb24gaGFzIGJlZW4gY2xvc2VkLlxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGluaXRpYWxpc2VDb25uZWN0aW9uKCkge1xuICAgIGNvbnN0IHNpZ25hbCA9IHRoaXMuY3JlYXRlQ29ubmVjdFRpbWVyKCk7XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5wb3J0KSB7XG4gICAgICByZXR1cm4gdGhpcy5jb25uZWN0T25Qb3J0KHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCwgdGhpcy5jb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyLCBzaWduYWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaW5zdGFuY2VMb29rdXAoe1xuICAgICAgICBzZXJ2ZXI6IHRoaXMuY29uZmlnLnNlcnZlcixcbiAgICAgICAgaW5zdGFuY2VOYW1lOiB0aGlzLmNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSEsXG4gICAgICAgIHRpbWVvdXQ6IHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXQsXG4gICAgICAgIHNpZ25hbDogc2lnbmFsXG4gICAgICB9KS50aGVuKChwb3J0KSA9PiB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRoaXMuY29ubmVjdE9uUG9ydChwb3J0LCB0aGlzLmNvbmZpZy5vcHRpb25zLm11bHRpU3VibmV0RmFpbG92ZXIsIHNpZ25hbCk7XG4gICAgICAgIH0pO1xuICAgICAgfSwgKGVycikgPT4ge1xuICAgICAgICB0aGlzLmNsZWFyQ29ubmVjdFRpbWVyKCk7XG4gICAgICAgIGlmIChlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSB7XG4gICAgICAgICAgLy8gSWdub3JlIHRoZSBBYm9ydEVycm9yIGZvciBub3csIHRoaXMgaXMgc3RpbGwgaGFuZGxlZCBieSB0aGUgY29ubmVjdFRpbWVyIGZpcmluZ1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIG5ldyBDb25uZWN0aW9uRXJyb3IoZXJyLm1lc3NhZ2UsICdFSU5TVExPT0tVUCcpKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNsZWFudXBDb25uZWN0aW9uKGNsZWFudXBUeXBlOiB0eXBlb2YgQ0xFQU5VUF9UWVBFW2tleW9mIHR5cGVvZiBDTEVBTlVQX1RZUEVdKSB7XG4gICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgdGhpcy5jbGVhckNvbm5lY3RUaW1lcigpO1xuICAgICAgdGhpcy5jbGVhclJlcXVlc3RUaW1lcigpO1xuICAgICAgdGhpcy5jbGVhclJldHJ5VGltZXIoKTtcbiAgICAgIHRoaXMuY2xvc2VDb25uZWN0aW9uKCk7XG4gICAgICBpZiAoY2xlYW51cFR5cGUgPT09IENMRUFOVVBfVFlQRS5SRURJUkVDVCkge1xuICAgICAgICB0aGlzLmVtaXQoJ3Jlcm91dGluZycpO1xuICAgICAgfSBlbHNlIGlmIChjbGVhbnVwVHlwZSAhPT0gQ0xFQU5VUF9UWVBFLlJFVFJZKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRoaXMuZW1pdCgnZW5kJyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0O1xuICAgICAgaWYgKHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgZXJyID0gbmV3IFJlcXVlc3RFcnJvcignQ29ubmVjdGlvbiBjbG9zZWQgYmVmb3JlIHJlcXVlc3QgY29tcGxldGVkLicsICdFQ0xPU0UnKTtcbiAgICAgICAgcmVxdWVzdC5jYWxsYmFjayhlcnIpO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgICAgIHRoaXMubG9naW5FcnJvciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNyZWF0ZURlYnVnKCkge1xuICAgIGNvbnN0IGRlYnVnID0gbmV3IERlYnVnKHRoaXMuY29uZmlnLm9wdGlvbnMuZGVidWcpO1xuICAgIGRlYnVnLm9uKCdkZWJ1ZycsIChtZXNzYWdlKSA9PiB7XG4gICAgICB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlYnVnO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlOiBNZXNzYWdlLCBoYW5kbGVyOiBUb2tlbkhhbmRsZXIpIHtcbiAgICByZXR1cm4gbmV3IFRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2UsIHRoaXMuZGVidWcsIGhhbmRsZXIsIHRoaXMuY29uZmlnLm9wdGlvbnMpO1xuICB9XG5cbiAgY29ubmVjdE9uUG9ydChwb3J0OiBudW1iZXIsIG11bHRpU3VibmV0RmFpbG92ZXI6IGJvb2xlYW4sIHNpZ25hbDogQWJvcnRTaWduYWwpIHtcbiAgICBjb25zdCBjb25uZWN0T3B0cyA9IHtcbiAgICAgIGhvc3Q6IHRoaXMucm91dGluZ0RhdGEgPyB0aGlzLnJvdXRpbmdEYXRhLnNlcnZlciA6IHRoaXMuY29uZmlnLnNlcnZlcixcbiAgICAgIHBvcnQ6IHRoaXMucm91dGluZ0RhdGEgPyB0aGlzLnJvdXRpbmdEYXRhLnBvcnQgOiBwb3J0LFxuICAgICAgbG9jYWxBZGRyZXNzOiB0aGlzLmNvbmZpZy5vcHRpb25zLmxvY2FsQWRkcmVzc1xuICAgIH07XG5cbiAgICBjb25zdCBjb25uZWN0ID0gbXVsdGlTdWJuZXRGYWlsb3ZlciA/IGNvbm5lY3RJblBhcmFsbGVsIDogY29ubmVjdEluU2VxdWVuY2U7XG5cbiAgICBjb25uZWN0KGNvbm5lY3RPcHRzLCBkbnMubG9va3VwLCBzaWduYWwpLnRoZW4oKHNvY2tldCkgPT4ge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyb3IpID0+IHsgdGhpcy5zb2NrZXRFcnJvcihlcnJvcik7IH0pO1xuICAgICAgICBzb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4geyB0aGlzLnNvY2tldENsb3NlKCk7IH0pO1xuICAgICAgICBzb2NrZXQub24oJ2VuZCcsICgpID0+IHsgdGhpcy5zb2NrZXRFbmQoKTsgfSk7XG4gICAgICAgIHNvY2tldC5zZXRLZWVwQWxpdmUodHJ1ZSwgS0VFUF9BTElWRV9JTklUSUFMX0RFTEFZKTtcblxuICAgICAgICB0aGlzLm1lc3NhZ2VJbyA9IG5ldyBNZXNzYWdlSU8oc29ja2V0LCB0aGlzLmNvbmZpZy5vcHRpb25zLnBhY2tldFNpemUsIHRoaXMuZGVidWcpO1xuICAgICAgICB0aGlzLm1lc3NhZ2VJby5vbignc2VjdXJlJywgKGNsZWFydGV4dCkgPT4geyB0aGlzLmVtaXQoJ3NlY3VyZScsIGNsZWFydGV4dCk7IH0pO1xuXG4gICAgICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuXG4gICAgICAgIHRoaXMuY2xvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZGVidWcubG9nKCdjb25uZWN0ZWQgdG8gJyArIHRoaXMuY29uZmlnLnNlcnZlciArICc6JyArIHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCk7XG5cbiAgICAgICAgdGhpcy5zZW5kUHJlTG9naW4oKTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX1BSRUxPR0lOKTtcbiAgICAgIH0pO1xuICAgIH0sIChlcnIpID0+IHtcbiAgICAgIHRoaXMuY2xlYXJDb25uZWN0VGltZXIoKTtcbiAgICAgIGlmIChlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7IHRoaXMuc29ja2V0RXJyb3IoZXJyKTsgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNsb3NlQ29ubmVjdGlvbigpIHtcbiAgICBpZiAodGhpcy5zb2NrZXQpIHtcbiAgICAgIHRoaXMuc29ja2V0LmRlc3Ryb3koKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNyZWF0ZUNvbm5lY3RUaW1lcigpIHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIHRoaXMuY29ubmVjdFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjb250cm9sbGVyLmFib3J0KCk7XG4gICAgICB0aGlzLmNvbm5lY3RUaW1lb3V0KCk7XG4gICAgfSwgdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dCk7XG4gICAgcmV0dXJuIGNvbnRyb2xsZXIuc2lnbmFsO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVDYW5jZWxUaW1lcigpIHtcbiAgICB0aGlzLmNsZWFyQ2FuY2VsVGltZXIoKTtcbiAgICBjb25zdCB0aW1lb3V0ID0gdGhpcy5jb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0O1xuICAgIGlmICh0aW1lb3V0ID4gMCkge1xuICAgICAgdGhpcy5jYW5jZWxUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmNhbmNlbFRpbWVvdXQoKTtcbiAgICAgIH0sIHRpbWVvdXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY3JlYXRlUmVxdWVzdFRpbWVyKCkge1xuICAgIHRoaXMuY2xlYXJSZXF1ZXN0VGltZXIoKTsgLy8gcmVsZWFzZSBvbGQgdGltZXIsIGp1c3QgdG8gYmUgc2FmZVxuICAgIGNvbnN0IHJlcXVlc3QgPSB0aGlzLnJlcXVlc3QgYXMgUmVxdWVzdDtcbiAgICBjb25zdCB0aW1lb3V0ID0gKHJlcXVlc3QudGltZW91dCAhPT0gdW5kZWZpbmVkKSA/IHJlcXVlc3QudGltZW91dCA6IHRoaXMuY29uZmlnLm9wdGlvbnMucmVxdWVzdFRpbWVvdXQ7XG4gICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgIHRoaXMucmVxdWVzdFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMucmVxdWVzdFRpbWVvdXQoKTtcbiAgICAgIH0sIHRpbWVvdXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY3JlYXRlUmV0cnlUaW1lcigpIHtcbiAgICB0aGlzLmNsZWFyUmV0cnlUaW1lcigpO1xuICAgIHRoaXMucmV0cnlUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5yZXRyeVRpbWVvdXQoKTtcbiAgICB9LCB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY29ubmVjdFRpbWVvdXQoKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGBGYWlsZWQgdG8gY29ubmVjdCB0byAke3RoaXMuY29uZmlnLnNlcnZlcn0ke3RoaXMuY29uZmlnLm9wdGlvbnMucG9ydCA/IGA6JHt0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnR9YCA6IGBcXFxcJHt0aGlzLmNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZX1gfSBpbiAke3RoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXR9bXNgO1xuICAgIHRoaXMuZGVidWcubG9nKG1lc3NhZ2UpO1xuICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIG5ldyBDb25uZWN0aW9uRXJyb3IobWVzc2FnZSwgJ0VUSU1FT1VUJykpO1xuICAgIHRoaXMuY29ubmVjdFRpbWVyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnY29ubmVjdFRpbWVvdXQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2FuY2VsVGltZW91dCgpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYEZhaWxlZCB0byBjYW5jZWwgcmVxdWVzdCBpbiAke3RoaXMuY29uZmlnLm9wdGlvbnMuY2FuY2VsVGltZW91dH1tc2A7XG4gICAgdGhpcy5kZWJ1Zy5sb2cobWVzc2FnZSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzb2NrZXRFcnJvcicsIG5ldyBDb25uZWN0aW9uRXJyb3IobWVzc2FnZSwgJ0VUSU1FT1VUJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICByZXF1ZXN0VGltZW91dCgpIHtcbiAgICB0aGlzLnJlcXVlc3RUaW1lciA9IHVuZGVmaW5lZDtcbiAgICBjb25zdCByZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0ITtcbiAgICByZXF1ZXN0LmNhbmNlbCgpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSAocmVxdWVzdC50aW1lb3V0ICE9PSB1bmRlZmluZWQpID8gcmVxdWVzdC50aW1lb3V0IDogdGhpcy5jb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dDtcbiAgICBjb25zdCBtZXNzYWdlID0gJ1RpbWVvdXQ6IFJlcXVlc3QgZmFpbGVkIHRvIGNvbXBsZXRlIGluICcgKyB0aW1lb3V0ICsgJ21zJztcbiAgICByZXF1ZXN0LmVycm9yID0gbmV3IFJlcXVlc3RFcnJvcihtZXNzYWdlLCAnRVRJTUVPVVQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcmV0cnlUaW1lb3V0KCkge1xuICAgIHRoaXMucmV0cnlUaW1lciA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmVtaXQoJ3JldHJ5Jyk7XG4gICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5DT05ORUNUSU5HKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xlYXJDb25uZWN0VGltZXIoKSB7XG4gICAgaWYgKHRoaXMuY29ubmVjdFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jb25uZWN0VGltZXIpO1xuICAgICAgdGhpcy5jb25uZWN0VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjbGVhckNhbmNlbFRpbWVyKCkge1xuICAgIGlmICh0aGlzLmNhbmNlbFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jYW5jZWxUaW1lcik7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xlYXJSZXF1ZXN0VGltZXIoKSB7XG4gICAgaWYgKHRoaXMucmVxdWVzdFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5yZXF1ZXN0VGltZXIpO1xuICAgICAgdGhpcy5yZXF1ZXN0VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjbGVhclJldHJ5VGltZXIoKSB7XG4gICAgaWYgKHRoaXMucmV0cnlUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmV0cnlUaW1lcik7XG4gICAgICB0aGlzLnJldHJ5VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICB0cmFuc2l0aW9uVG8obmV3U3RhdGU6IFN0YXRlKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT09IG5ld1N0YXRlKSB7XG4gICAgICB0aGlzLmRlYnVnLmxvZygnU3RhdGUgaXMgYWxyZWFkeSAnICsgbmV3U3RhdGUubmFtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RhdGUgJiYgdGhpcy5zdGF0ZS5leGl0KSB7XG4gICAgICB0aGlzLnN0YXRlLmV4aXQuY2FsbCh0aGlzLCBuZXdTdGF0ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5kZWJ1Zy5sb2coJ1N0YXRlIGNoYW5nZTogJyArICh0aGlzLnN0YXRlID8gdGhpcy5zdGF0ZS5uYW1lIDogJ3VuZGVmaW5lZCcpICsgJyAtPiAnICsgbmV3U3RhdGUubmFtZSk7XG4gICAgdGhpcy5zdGF0ZSA9IG5ld1N0YXRlO1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuZW50ZXIpIHtcbiAgICAgIHRoaXMuc3RhdGUuZW50ZXIuYXBwbHkodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRFdmVudEhhbmRsZXI8VCBleHRlbmRzIGtleW9mIFN0YXRlWydldmVudHMnXT4oZXZlbnROYW1lOiBUKTogTm9uTnVsbGFibGU8U3RhdGVbJ2V2ZW50cyddW1RdPiB7XG4gICAgY29uc3QgaGFuZGxlciA9IHRoaXMuc3RhdGUuZXZlbnRzW2V2ZW50TmFtZV07XG5cbiAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gZXZlbnQgJyR7ZXZlbnROYW1lfScgaW4gc3RhdGUgJyR7dGhpcy5zdGF0ZS5uYW1lfSdgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFuZGxlciE7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRpc3BhdGNoRXZlbnQ8VCBleHRlbmRzIGtleW9mIFN0YXRlWydldmVudHMnXT4oZXZlbnROYW1lOiBULCAuLi5hcmdzOiBQYXJhbWV0ZXJzPE5vbk51bGxhYmxlPFN0YXRlWydldmVudHMnXVtUXT4+KSB7XG4gICAgY29uc3QgaGFuZGxlciA9IHRoaXMuc3RhdGUuZXZlbnRzW2V2ZW50TmFtZV0gYXMgKCh0aGlzOiBDb25uZWN0aW9uLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoYE5vIGV2ZW50ICcke2V2ZW50TmFtZX0nIGluIHN0YXRlICcke3RoaXMuc3RhdGUubmFtZX0nYCkpO1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc29ja2V0RXJyb3IoZXJyb3I6IEVycm9yKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT09IHRoaXMuU1RBVEUuQ09OTkVDVElORyB8fCB0aGlzLnN0YXRlID09PSB0aGlzLlNUQVRFLlNFTlRfVExTU1NMTkVHT1RJQVRJT04pIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgRmFpbGVkIHRvIGNvbm5lY3QgdG8gJHt0aGlzLmNvbmZpZy5zZXJ2ZXJ9OiR7dGhpcy5jb25maWcub3B0aW9ucy5wb3J0fSAtICR7ZXJyb3IubWVzc2FnZX1gO1xuICAgICAgdGhpcy5kZWJ1Zy5sb2cobWVzc2FnZSk7XG4gICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnLCBuZXcgQ29ubmVjdGlvbkVycm9yKG1lc3NhZ2UsICdFU09DS0VUJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gYENvbm5lY3Rpb24gbG9zdCAtICR7ZXJyb3IubWVzc2FnZX1gO1xuICAgICAgdGhpcy5kZWJ1Zy5sb2cobWVzc2FnZSk7XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IENvbm5lY3Rpb25FcnJvcihtZXNzYWdlLCAnRVNPQ0tFVCcpKTtcbiAgICB9XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzb2NrZXRFcnJvcicsIGVycm9yKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc29ja2V0RW5kKCkge1xuICAgIHRoaXMuZGVidWcubG9nKCdzb2NrZXQgZW5kZWQnKTtcbiAgICBpZiAodGhpcy5zdGF0ZSAhPT0gdGhpcy5TVEFURS5GSU5BTCkge1xuICAgICAgY29uc3QgZXJyb3I6IEVycm9yV2l0aENvZGUgPSBuZXcgRXJyb3IoJ3NvY2tldCBoYW5nIHVwJyk7XG4gICAgICBlcnJvci5jb2RlID0gJ0VDT05OUkVTRVQnO1xuICAgICAgdGhpcy5zb2NrZXRFcnJvcihlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzb2NrZXRDbG9zZSgpIHtcbiAgICB0aGlzLmRlYnVnLmxvZygnY29ubmVjdGlvbiB0byAnICsgdGhpcy5jb25maWcuc2VydmVyICsgJzonICsgdGhpcy5jb25maWcub3B0aW9ucy5wb3J0ICsgJyBjbG9zZWQnKTtcbiAgICBpZiAodGhpcy5zdGF0ZSA9PT0gdGhpcy5TVEFURS5SRVJPVVRJTkcpIHtcbiAgICAgIHRoaXMuZGVidWcubG9nKCdSZXJvdXRpbmcgdG8gJyArIHRoaXMucm91dGluZ0RhdGEhLnNlcnZlciArICc6JyArIHRoaXMucm91dGluZ0RhdGEhLnBvcnQpO1xuXG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3JlY29ubmVjdCcpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZSA9PT0gdGhpcy5TVEFURS5UUkFOU0lFTlRfRkFJTFVSRV9SRVRSWSkge1xuICAgICAgY29uc3Qgc2VydmVyID0gdGhpcy5yb3V0aW5nRGF0YSA/IHRoaXMucm91dGluZ0RhdGEuc2VydmVyIDogdGhpcy5jb25maWcuc2VydmVyO1xuICAgICAgY29uc3QgcG9ydCA9IHRoaXMucm91dGluZ0RhdGEgPyB0aGlzLnJvdXRpbmdEYXRhLnBvcnQgOiB0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnQ7XG4gICAgICB0aGlzLmRlYnVnLmxvZygnUmV0cnkgYWZ0ZXIgdHJhbnNpZW50IGZhaWx1cmUgY29ubmVjdGluZyB0byAnICsgc2VydmVyICsgJzonICsgcG9ydCk7XG5cbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgncmV0cnknKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzZW5kUHJlTG9naW4oKSB7XG4gICAgY29uc3QgWyAsIG1ham9yLCBtaW5vciwgYnVpbGQgXSA9IC9eKFxcZCspXFwuKFxcZCspXFwuKFxcZCspLy5leGVjKHZlcnNpb24pID8/IFsgJzAuMC4wJywgJzAnLCAnMCcsICcwJyBdO1xuXG4gICAgY29uc3QgcGF5bG9hZCA9IG5ldyBQcmVsb2dpblBheWxvYWQoe1xuICAgICAgZW5jcnlwdDogdGhpcy5jb25maWcub3B0aW9ucy5lbmNyeXB0LFxuICAgICAgdmVyc2lvbjogeyBtYWpvcjogTnVtYmVyKG1ham9yKSwgbWlub3I6IE51bWJlcihtaW5vciksIGJ1aWxkOiBOdW1iZXIoYnVpbGQpLCBzdWJidWlsZDogMCB9XG4gICAgfSk7XG5cbiAgICB0aGlzLm1lc3NhZ2VJby5zZW5kTWVzc2FnZShUWVBFLlBSRUxPR0lOLCBwYXlsb2FkLmRhdGEpO1xuICAgIHRoaXMuZGVidWcucGF5bG9hZChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwYXlsb2FkLnRvU3RyaW5nKCcgICcpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzZW5kTG9naW43UGFja2V0KCkge1xuICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgTG9naW43UGF5bG9hZCh7XG4gICAgICB0ZHNWZXJzaW9uOiB2ZXJzaW9uc1t0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb25dLFxuICAgICAgcGFja2V0U2l6ZTogdGhpcy5jb25maWcub3B0aW9ucy5wYWNrZXRTaXplLFxuICAgICAgY2xpZW50UHJvZ1ZlcjogMCxcbiAgICAgIGNsaWVudFBpZDogcHJvY2Vzcy5waWQsXG4gICAgICBjb25uZWN0aW9uSWQ6IDAsXG4gICAgICBjbGllbnRUaW1lWm9uZTogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpLFxuICAgICAgY2xpZW50TGNpZDogMHgwMDAwMDQwOVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBhdXRoZW50aWNhdGlvbiB9ID0gdGhpcy5jb25maWc7XG4gICAgc3dpdGNoIChhdXRoZW50aWNhdGlvbi50eXBlKSB7XG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJzpcbiAgICAgICAgcGF5bG9hZC5mZWRBdXRoID0ge1xuICAgICAgICAgIHR5cGU6ICdBREFMJyxcbiAgICAgICAgICBlY2hvOiB0aGlzLmZlZEF1dGhSZXF1aXJlZCxcbiAgICAgICAgICB3b3JrZmxvdzogJ2RlZmF1bHQnXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbic6XG4gICAgICAgIHBheWxvYWQuZmVkQXV0aCA9IHtcbiAgICAgICAgICB0eXBlOiAnU0VDVVJJVFlUT0tFTicsXG4gICAgICAgICAgZWNobzogdGhpcy5mZWRBdXRoUmVxdWlyZWQsXG4gICAgICAgICAgZmVkQXV0aFRva2VuOiBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnRva2VuXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bSc6XG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnOlxuICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnOlxuICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnOlxuICAgICAgICBwYXlsb2FkLmZlZEF1dGggPSB7XG4gICAgICAgICAgdHlwZTogJ0FEQUwnLFxuICAgICAgICAgIGVjaG86IHRoaXMuZmVkQXV0aFJlcXVpcmVkLFxuICAgICAgICAgIHdvcmtmbG93OiAnaW50ZWdyYXRlZCdcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ250bG0nOlxuICAgICAgICBwYXlsb2FkLnNzcGkgPSBjcmVhdGVOVExNUmVxdWVzdCh7IGRvbWFpbjogYXV0aGVudGljYXRpb24ub3B0aW9ucy5kb21haW4gfSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBwYXlsb2FkLnVzZXJOYW1lID0gYXV0aGVudGljYXRpb24ub3B0aW9ucy51c2VyTmFtZTtcbiAgICAgICAgcGF5bG9hZC5wYXNzd29yZCA9IGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMucGFzc3dvcmQ7XG4gICAgfVxuXG4gICAgcGF5bG9hZC5ob3N0bmFtZSA9IHRoaXMuY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZCB8fCBvcy5ob3N0bmFtZSgpO1xuICAgIHBheWxvYWQuc2VydmVyTmFtZSA9IHRoaXMucm91dGluZ0RhdGEgPyB0aGlzLnJvdXRpbmdEYXRhLnNlcnZlciA6IHRoaXMuY29uZmlnLnNlcnZlcjtcbiAgICBwYXlsb2FkLmFwcE5hbWUgPSB0aGlzLmNvbmZpZy5vcHRpb25zLmFwcE5hbWUgfHwgJ1RlZGlvdXMnO1xuICAgIHBheWxvYWQubGlicmFyeU5hbWUgPSBsaWJyYXJ5TmFtZTtcbiAgICBwYXlsb2FkLmxhbmd1YWdlID0gdGhpcy5jb25maWcub3B0aW9ucy5sYW5ndWFnZTtcbiAgICBwYXlsb2FkLmRhdGFiYXNlID0gdGhpcy5jb25maWcub3B0aW9ucy5kYXRhYmFzZTtcbiAgICBwYXlsb2FkLmNsaWVudElkID0gQnVmZmVyLmZyb20oWzEsIDIsIDMsIDQsIDUsIDZdKTtcblxuICAgIHBheWxvYWQucmVhZE9ubHlJbnRlbnQgPSB0aGlzLmNvbmZpZy5vcHRpb25zLnJlYWRPbmx5SW50ZW50O1xuICAgIHBheWxvYWQuaW5pdERiRmF0YWwgPSAhdGhpcy5jb25maWcub3B0aW9ucy5mYWxsYmFja1RvRGVmYXVsdERiO1xuXG4gICAgdGhpcy5yb3V0aW5nRGF0YSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLm1lc3NhZ2VJby5zZW5kTWVzc2FnZShUWVBFLkxPR0lONywgcGF5bG9hZC50b0J1ZmZlcigpKTtcblxuICAgIHRoaXMuZGVidWcucGF5bG9hZChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwYXlsb2FkLnRvU3RyaW5nKCcgICcpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzZW5kRmVkQXV0aFRva2VuTWVzc2FnZSh0b2tlbjogc3RyaW5nKSB7XG4gICAgY29uc3QgYWNjZXNzVG9rZW5MZW4gPSBCdWZmZXIuYnl0ZUxlbmd0aCh0b2tlbiwgJ3VjczInKTtcbiAgICBjb25zdCBkYXRhID0gQnVmZmVyLmFsbG9jKDggKyBhY2Nlc3NUb2tlbkxlbik7XG4gICAgbGV0IG9mZnNldCA9IDA7XG4gICAgb2Zmc2V0ID0gZGF0YS53cml0ZVVJbnQzMkxFKGFjY2Vzc1Rva2VuTGVuICsgNCwgb2Zmc2V0KTtcbiAgICBvZmZzZXQgPSBkYXRhLndyaXRlVUludDMyTEUoYWNjZXNzVG9rZW5MZW4sIG9mZnNldCk7XG4gICAgZGF0YS53cml0ZSh0b2tlbiwgb2Zmc2V0LCAndWNzMicpO1xuICAgIHRoaXMubWVzc2FnZUlvLnNlbmRNZXNzYWdlKFRZUEUuRkVEQVVUSF9UT0tFTiwgZGF0YSk7XG4gICAgLy8gc2VudCB0aGUgZmVkQXV0aCB0b2tlbiBtZXNzYWdlLCB0aGUgcmVzdCBpcyBzaW1pbGFyIHRvIHN0YW5kYXJkIGxvZ2luIDdcbiAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfTE9HSU43X1dJVEhfU1RBTkRBUkRfTE9HSU4pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzZW5kSW5pdGlhbFNxbCgpIHtcbiAgICBjb25zdCBwYXlsb2FkID0gbmV3IFNxbEJhdGNoUGF5bG9hZCh0aGlzLmdldEluaXRpYWxTcWwoKSwgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCksIHRoaXMuY29uZmlnLm9wdGlvbnMpO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKHsgdHlwZTogVFlQRS5TUUxfQkFUQ0ggfSk7XG4gICAgdGhpcy5tZXNzYWdlSW8ub3V0Z29pbmdNZXNzYWdlU3RyZWFtLndyaXRlKG1lc3NhZ2UpO1xuICAgIFJlYWRhYmxlLmZyb20ocGF5bG9hZCkucGlwZShtZXNzYWdlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZ2V0SW5pdGlhbFNxbCgpIHtcbiAgICBjb25zdCBvcHRpb25zID0gW107XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9udWxscyBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFuc2lfbnVsbHMgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX251bGxfZGZsdF9vbiBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX251bGxfZGZsdF9vbiBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9wYWRkaW5nIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9wYWRkaW5nIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV93YXJuaW5ncyBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpV2FybmluZ3MgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX3dhcm5pbmdzIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFyaXRoYWJvcnQgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFyaXRoYWJvcnQgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGNvbmNhdF9udWxsX3lpZWxkc19udWxsIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY29uY2F0X251bGxfeWllbGRzX251bGwgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdCA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY3Vyc29yX2Nsb3NlX29uX2NvbW1pdCBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY3Vyc29yX2Nsb3NlX29uX2NvbW1pdCBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5kYXRlZmlyc3QgIT09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMucHVzaChgc2V0IGRhdGVmaXJzdCAke3RoaXMuY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0fWApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQgIT09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMucHVzaChgc2V0IGRhdGVmb3JtYXQgJHt0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXR9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGltcGxpY2l0X3RyYW5zYWN0aW9ucyBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGltcGxpY2l0X3RyYW5zYWN0aW9ucyBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5sYW5ndWFnZSAhPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucy5wdXNoKGBzZXQgbGFuZ3VhZ2UgJHt0aGlzLmNvbmZpZy5vcHRpb25zLmxhbmd1YWdlfWApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZU51bWVyaWNSb3VuZGFib3J0ID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBudW1lcmljX3JvdW5kYWJvcnQgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBudW1lcmljX3JvdW5kYWJvcnQgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllciA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgcXVvdGVkX2lkZW50aWZpZXIgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllciA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IHF1b3RlZF9pZGVudGlmaWVyIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRleHRzaXplICE9PSBudWxsKSB7XG4gICAgICBvcHRpb25zLnB1c2goYHNldCB0ZXh0c2l6ZSAke3RoaXMuY29uZmlnLm9wdGlvbnMudGV4dHNpemV9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsICE9PSBudWxsKSB7XG4gICAgICBvcHRpb25zLnB1c2goYHNldCB0cmFuc2FjdGlvbiBpc29sYXRpb24gbGV2ZWwgJHt0aGlzLmdldElzb2xhdGlvbkxldmVsVGV4dCh0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCl9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3IgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IHhhY3RfYWJvcnQgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3IgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCB4YWN0X2Fib3J0IG9mZicpO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBwcm9jZXNzZWRJbml0aWFsU3FsKCkge1xuICAgIHRoaXMuY2xlYXJDb25uZWN0VGltZXIoKTtcbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIHRoZSBTUUwgYmF0Y2ggcmVwcmVzZW50ZWQgYnkgW1tSZXF1ZXN0XV0uXG4gICAqIFRoZXJlIGlzIG5vIHBhcmFtIHN1cHBvcnQsIGFuZCB1bmxpa2UgW1tSZXF1ZXN0LmV4ZWNTcWxdXSxcbiAgICogaXQgaXMgbm90IGxpa2VseSB0aGF0IFNRTCBTZXJ2ZXIgd2lsbCByZXVzZSB0aGUgZXhlY3V0aW9uIHBsYW4gaXQgZ2VuZXJhdGVzIGZvciB0aGUgU1FMLlxuICAgKlxuICAgKiBJbiBhbG1vc3QgYWxsIGNhc2VzLCBbW1JlcXVlc3QuZXhlY1NxbF1dIHdpbGwgYmUgYSBiZXR0ZXIgY2hvaWNlLlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBBIFtbUmVxdWVzdF1dIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJlcXVlc3QuXG4gICAqL1xuICBleGVjU3FsQmF0Y2gocmVxdWVzdDogUmVxdWVzdCkge1xuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5TUUxfQkFUQ0gsIG5ldyBTcWxCYXRjaFBheWxvYWQocmVxdWVzdC5zcWxUZXh0T3JQcm9jZWR1cmUhLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucykpO1xuICB9XG5cbiAgLyoqXG4gICAqICBFeGVjdXRlIHRoZSBTUUwgcmVwcmVzZW50ZWQgYnkgW1tSZXF1ZXN0XV0uXG4gICAqXG4gICAqIEFzIGBzcF9leGVjdXRlc3FsYCBpcyB1c2VkIHRvIGV4ZWN1dGUgdGhlIFNRTCwgaWYgdGhlIHNhbWUgU1FMIGlzIGV4ZWN1dGVkIG11bHRpcGxlcyB0aW1lc1xuICAgKiB1c2luZyB0aGlzIGZ1bmN0aW9uLCB0aGUgU1FMIFNlcnZlciBxdWVyeSBvcHRpbWl6ZXIgaXMgbGlrZWx5IHRvIHJldXNlIHRoZSBleGVjdXRpb24gcGxhbiBpdCBnZW5lcmF0ZXNcbiAgICogZm9yIHRoZSBmaXJzdCBleGVjdXRpb24uIFRoaXMgbWF5IGFsc28gcmVzdWx0IGluIFNRTCBzZXJ2ZXIgdHJlYXRpbmcgdGhlIHJlcXVlc3QgbGlrZSBhIHN0b3JlZCBwcm9jZWR1cmVcbiAgICogd2hpY2ggY2FuIHJlc3VsdCBpbiB0aGUgW1tFdmVudF9kb25lSW5Qcm9jXV0gb3IgW1tFdmVudF9kb25lUHJvY11dIGV2ZW50cyBiZWluZyBlbWl0dGVkIGluc3RlYWQgb2YgdGhlXG4gICAqIFtbRXZlbnRfZG9uZV1dIGV2ZW50IHlvdSBtaWdodCBleHBlY3QuIFVzaW5nIFtbZXhlY1NxbEJhdGNoXV0gd2lsbCBwcmV2ZW50IHRoaXMgZnJvbSBvY2N1cnJpbmcgYnV0IG1heSBoYXZlIGEgbmVnYXRpdmUgcGVyZm9ybWFuY2UgaW1wYWN0LlxuICAgKlxuICAgKiBCZXdhcmUgb2YgdGhlIHdheSB0aGF0IHNjb3BpbmcgcnVsZXMgYXBwbHksIGFuZCBob3cgdGhleSBtYXkgW2FmZmVjdCBsb2NhbCB0ZW1wIHRhYmxlc10oaHR0cDovL3dlYmxvZ3Muc3FsdGVhbS5jb20vbWxhZGVucC9hcmNoaXZlLzIwMDYvMTEvMDMvMTcxOTcuYXNweClcbiAgICogSWYgeW91J3JlIHJ1bm5pbmcgaW4gdG8gc2NvcGluZyBpc3N1ZXMsIHRoZW4gW1tleGVjU3FsQmF0Y2hdXSBtYXkgYmUgYSBiZXR0ZXIgY2hvaWNlLlxuICAgKiBTZWUgYWxzbyBbaXNzdWUgIzI0XShodHRwczovL2dpdGh1Yi5jb20vcGVraW0vdGVkaW91cy9pc3N1ZXMvMjQpXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IEEgW1tSZXF1ZXN0XV0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGV4ZWNTcWwocmVxdWVzdDogUmVxdWVzdCkge1xuICAgIHRyeSB7XG4gICAgICByZXF1ZXN0LnZhbGlkYXRlUGFyYW1ldGVycyh0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICByZXF1ZXN0LmVycm9yID0gZXJyb3I7XG5cbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnLmxvZyhlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgcmVxdWVzdC5jYWxsYmFjayhlcnJvcik7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdID0gW107XG5cbiAgICBwYXJhbWV0ZXJzLnB1c2goe1xuICAgICAgdHlwZTogVFlQRVMuTlZhckNoYXIsXG4gICAgICBuYW1lOiAnc3RhdGVtZW50JyxcbiAgICAgIHZhbHVlOiByZXF1ZXN0LnNxbFRleHRPclByb2NlZHVyZSxcbiAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgaWYgKHJlcXVlc3QucGFyYW1ldGVycy5sZW5ndGgpIHtcbiAgICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICAgIHR5cGU6IFRZUEVTLk5WYXJDaGFyLFxuICAgICAgICBuYW1lOiAncGFyYW1zJyxcbiAgICAgICAgdmFsdWU6IHJlcXVlc3QubWFrZVBhcmFtc1BhcmFtZXRlcihyZXF1ZXN0LnBhcmFtZXRlcnMpLFxuICAgICAgICBvdXRwdXQ6IGZhbHNlLFxuICAgICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICAgIHNjYWxlOiB1bmRlZmluZWRcbiAgICAgIH0pO1xuXG4gICAgICBwYXJhbWV0ZXJzLnB1c2goLi4ucmVxdWVzdC5wYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuUlBDX1JFUVVFU1QsIG5ldyBScGNSZXF1ZXN0UGF5bG9hZCgnc3BfZXhlY3V0ZXNxbCcsIHBhcmFtZXRlcnMsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpLCB0aGlzLmNvbmZpZy5vcHRpb25zLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBCdWxrTG9hZCBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIHRhYmxlIFRoZSBuYW1lIG9mIHRoZSB0YWJsZSB0byBidWxrLWluc2VydCBpbnRvLlxuICAgKiBAcGFyYW0gb3B0aW9ucyBBIHNldCBvZiBidWxrIGxvYWQgb3B0aW9ucy5cbiAgICovXG4gIG5ld0J1bGtMb2FkKHRhYmxlOiBzdHJpbmcsIGNhbGxiYWNrOiBCdWxrTG9hZENhbGxiYWNrKTogQnVsa0xvYWRcbiAgbmV3QnVsa0xvYWQodGFibGU6IHN0cmluZywgb3B0aW9uczogQnVsa0xvYWRPcHRpb25zLCBjYWxsYmFjazogQnVsa0xvYWRDYWxsYmFjayk6IEJ1bGtMb2FkXG4gIG5ld0J1bGtMb2FkKHRhYmxlOiBzdHJpbmcsIGNhbGxiYWNrT3JPcHRpb25zOiBCdWxrTG9hZE9wdGlvbnMgfCBCdWxrTG9hZENhbGxiYWNrLCBjYWxsYmFjaz86IEJ1bGtMb2FkQ2FsbGJhY2spIHtcbiAgICBsZXQgb3B0aW9uczogQnVsa0xvYWRPcHRpb25zO1xuXG4gICAgaWYgKGNhbGxiYWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2tPck9wdGlvbnMgYXMgQnVsa0xvYWRDYWxsYmFjaztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrT3JPcHRpb25zIGFzIEJ1bGtMb2FkT3B0aW9ucztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcIm9wdGlvbnNcIiBhcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEJ1bGtMb2FkKHRhYmxlLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uLCB0aGlzLmNvbmZpZy5vcHRpb25zLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBhIFtbQnVsa0xvYWRdXS5cbiAgICpcbiAgICogYGBganNcbiAgICogLy8gV2Ugd2FudCB0byBwZXJmb3JtIGEgYnVsayBsb2FkIGludG8gYSB0YWJsZSB3aXRoIHRoZSBmb2xsb3dpbmcgZm9ybWF0OlxuICAgKiAvLyBDUkVBVEUgVEFCTEUgZW1wbG95ZWVzIChmaXJzdF9uYW1lIG52YXJjaGFyKDI1NSksIGxhc3RfbmFtZSBudmFyY2hhcigyNTUpLCBkYXlfb2ZfYmlydGggZGF0ZSk7XG4gICAqXG4gICAqIGNvbnN0IGJ1bGtMb2FkID0gY29ubmVjdGlvbi5uZXdCdWxrTG9hZCgnZW1wbG95ZWVzJywgKGVyciwgcm93Q291bnQpID0+IHtcbiAgICogICAvLyAuLi5cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIEZpcnN0LCB3ZSBuZWVkIHRvIHNwZWNpZnkgdGhlIGNvbHVtbnMgdGhhdCB3ZSB3YW50IHRvIHdyaXRlIHRvLFxuICAgKiAvLyBhbmQgdGhlaXIgZGVmaW5pdGlvbnMuIFRoZXNlIGRlZmluaXRpb25zIG11c3QgbWF0Y2ggdGhlIGFjdHVhbCB0YWJsZSxcbiAgICogLy8gb3RoZXJ3aXNlIHRoZSBidWxrIGxvYWQgd2lsbCBmYWlsLlxuICAgKiBidWxrTG9hZC5hZGRDb2x1bW4oJ2ZpcnN0X25hbWUnLCBUWVBFUy5OVmFyY2hhciwgeyBudWxsYWJsZTogZmFsc2UgfSk7XG4gICAqIGJ1bGtMb2FkLmFkZENvbHVtbignbGFzdF9uYW1lJywgVFlQRVMuTlZhcmNoYXIsIHsgbnVsbGFibGU6IGZhbHNlIH0pO1xuICAgKiBidWxrTG9hZC5hZGRDb2x1bW4oJ2RhdGVfb2ZfYmlydGgnLCBUWVBFUy5EYXRlLCB7IG51bGxhYmxlOiBmYWxzZSB9KTtcbiAgICpcbiAgICogLy8gRXhlY3V0ZSBhIGJ1bGsgbG9hZCB3aXRoIGEgcHJlZGVmaW5lZCBsaXN0IG9mIHJvd3MuXG4gICAqIC8vXG4gICAqIC8vIE5vdGUgdGhhdCB0aGVzZSByb3dzIGFyZSBoZWxkIGluIG1lbW9yeSB1bnRpbCB0aGVcbiAgICogLy8gYnVsayBsb2FkIHdhcyBwZXJmb3JtZWQsIHNvIGlmIHlvdSBuZWVkIHRvIHdyaXRlIGEgbGFyZ2VcbiAgICogLy8gbnVtYmVyIG9mIHJvd3MgKGUuZy4gYnkgcmVhZGluZyBmcm9tIGEgQ1NWIGZpbGUpLFxuICAgKiAvLyBwYXNzaW5nIGFuIGBBc3luY0l0ZXJhYmxlYCBpcyBhZHZpc2FibGUgdG8ga2VlcCBtZW1vcnkgdXNhZ2UgbG93LlxuICAgKiBjb25uZWN0aW9uLmV4ZWNCdWxrTG9hZChidWxrTG9hZCwgW1xuICAgKiAgIHsgJ2ZpcnN0X25hbWUnOiAnU3RldmUnLCAnbGFzdF9uYW1lJzogJ0pvYnMnLCAnZGF5X29mX2JpcnRoJzogbmV3IERhdGUoJzAyLTI0LTE5NTUnKSB9LFxuICAgKiAgIHsgJ2ZpcnN0X25hbWUnOiAnQmlsbCcsICdsYXN0X25hbWUnOiAnR2F0ZXMnLCAnZGF5X29mX2JpcnRoJzogbmV3IERhdGUoJzEwLTI4LTE5NTUnKSB9XG4gICAqIF0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGJ1bGtMb2FkIEEgcHJldmlvdXNseSBjcmVhdGVkIFtbQnVsa0xvYWRdXS5cbiAgICogQHBhcmFtIHJvd3MgQSBbW0l0ZXJhYmxlXV0gb3IgW1tBc3luY0l0ZXJhYmxlXV0gdGhhdCBjb250YWlucyB0aGUgcm93cyB0aGF0IHNob3VsZCBiZSBidWxrIGxvYWRlZC5cbiAgICovXG4gIGV4ZWNCdWxrTG9hZChidWxrTG9hZDogQnVsa0xvYWQsIHJvd3M6IEFzeW5jSXRlcmFibGU8dW5rbm93bltdIHwgeyBbY29sdW1uTmFtZTogc3RyaW5nXTogdW5rbm93biB9PiB8IEl0ZXJhYmxlPHVua25vd25bXSB8IHsgW2NvbHVtbk5hbWU6IHN0cmluZ106IHVua25vd24gfT4pOiB2b2lkXG5cbiAgZXhlY0J1bGtMb2FkKGJ1bGtMb2FkOiBCdWxrTG9hZCwgcm93cz86IEFzeW5jSXRlcmFibGU8dW5rbm93bltdIHwgeyBbY29sdW1uTmFtZTogc3RyaW5nXTogdW5rbm93biB9PiB8IEl0ZXJhYmxlPHVua25vd25bXSB8IHsgW2NvbHVtbk5hbWU6IHN0cmluZ106IHVua25vd24gfT4pIHtcbiAgICBidWxrTG9hZC5leGVjdXRpb25TdGFydGVkID0gdHJ1ZTtcblxuICAgIGlmIChyb3dzKSB7XG4gICAgICBpZiAoYnVsa0xvYWQuc3RyZWFtaW5nTW9kZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb25uZWN0aW9uLmV4ZWNCdWxrTG9hZCBjYW4ndCBiZSBjYWxsZWQgd2l0aCBhIEJ1bGtMb2FkIHRoYXQgd2FzIHB1dCBpbiBzdHJlYW1pbmcgbW9kZS5cIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChidWxrTG9hZC5maXJzdFJvd1dyaXR0ZW4pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ29ubmVjdGlvbi5leGVjQnVsa0xvYWQgY2FuJ3QgYmUgY2FsbGVkIHdpdGggYSBCdWxrTG9hZCB0aGF0IGFscmVhZHkgaGFzIHJvd3Mgd3JpdHRlbiB0byBpdC5cIik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJvd1N0cmVhbSA9IFJlYWRhYmxlLmZyb20ocm93cyk7XG5cbiAgICAgIC8vIERlc3Ryb3kgdGhlIHBhY2tldCB0cmFuc2Zvcm0gaWYgYW4gZXJyb3IgaGFwcGVucyBpbiB0aGUgcm93IHN0cmVhbSxcbiAgICAgIC8vIGUuZy4gaWYgYW4gZXJyb3IgaXMgdGhyb3duIGZyb20gd2l0aGluIGEgZ2VuZXJhdG9yIG9yIHN0cmVhbS5cbiAgICAgIHJvd1N0cmVhbS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIGJ1bGtMb2FkLnJvd1RvUGFja2V0VHJhbnNmb3JtLmRlc3Ryb3koZXJyKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBEZXN0cm95IHRoZSByb3cgc3RyZWFtIGlmIGFuIGVycm9yIGhhcHBlbnMgaW4gdGhlIHBhY2tldCB0cmFuc2Zvcm0sXG4gICAgICAvLyBlLmcuIGlmIHRoZSBidWxrIGxvYWQgaXMgY2FuY2VsbGVkLlxuICAgICAgYnVsa0xvYWQucm93VG9QYWNrZXRUcmFuc2Zvcm0ub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICByb3dTdHJlYW0uZGVzdHJveShlcnIpO1xuICAgICAgfSk7XG5cbiAgICAgIHJvd1N0cmVhbS5waXBlKGJ1bGtMb2FkLnJvd1RvUGFja2V0VHJhbnNmb3JtKTtcbiAgICB9IGVsc2UgaWYgKCFidWxrTG9hZC5zdHJlYW1pbmdNb2RlKSB7XG4gICAgICAvLyBJZiB0aGUgYnVsa2xvYWQgd2FzIG5vdCBwdXQgaW50byBzdHJlYW1pbmcgbW9kZSBieSB0aGUgdXNlcixcbiAgICAgIC8vIHdlIGVuZCB0aGUgcm93VG9QYWNrZXRUcmFuc2Zvcm0gaGVyZSBmb3IgdGhlbS5cbiAgICAgIC8vXG4gICAgICAvLyBJZiBpdCB3YXMgcHV0IGludG8gc3RyZWFtaW5nIG1vZGUsIGl0J3MgdGhlIHVzZXIncyByZXNwb25zaWJpbGl0eVxuICAgICAgLy8gdG8gZW5kIHRoZSBzdHJlYW0uXG4gICAgICBidWxrTG9hZC5yb3dUb1BhY2tldFRyYW5zZm9ybS5lbmQoKTtcbiAgICB9XG5cbiAgICBjb25zdCBvbkNhbmNlbCA9ICgpID0+IHtcbiAgICAgIHJlcXVlc3QuY2FuY2VsKCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgQnVsa0xvYWRQYXlsb2FkKGJ1bGtMb2FkKTtcblxuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdChidWxrTG9hZC5nZXRCdWxrSW5zZXJ0U3FsKCksIChlcnJvcjogKEVycm9yICYgeyBjb2RlPzogc3RyaW5nIH0pIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4ge1xuICAgICAgYnVsa0xvYWQucmVtb3ZlTGlzdGVuZXIoJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcblxuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvci5jb2RlID09PSAnVU5LTk9XTicpIHtcbiAgICAgICAgICBlcnJvci5tZXNzYWdlICs9ICcgVGhpcyBpcyBsaWtlbHkgYmVjYXVzZSB0aGUgc2NoZW1hIG9mIHRoZSBCdWxrTG9hZCBkb2VzIG5vdCBtYXRjaCB0aGUgc2NoZW1hIG9mIHRoZSB0YWJsZSB5b3UgYXJlIGF0dGVtcHRpbmcgdG8gaW5zZXJ0IGludG8uJztcbiAgICAgICAgfVxuICAgICAgICBidWxrTG9hZC5lcnJvciA9IGVycm9yO1xuICAgICAgICBidWxrTG9hZC5jYWxsYmFjayhlcnJvcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5tYWtlUmVxdWVzdChidWxrTG9hZCwgVFlQRS5CVUxLX0xPQUQsIHBheWxvYWQpO1xuICAgIH0pO1xuXG4gICAgYnVsa0xvYWQub25jZSgnY2FuY2VsJywgb25DYW5jZWwpO1xuXG4gICAgdGhpcy5leGVjU3FsQmF0Y2gocmVxdWVzdCk7XG4gIH1cblxuICAvKipcbiAgICogUHJlcGFyZSB0aGUgU1FMIHJlcHJlc2VudGVkIGJ5IHRoZSByZXF1ZXN0LlxuICAgKlxuICAgKiBUaGUgcmVxdWVzdCBjYW4gdGhlbiBiZSB1c2VkIGluIHN1YnNlcXVlbnQgY2FsbHMgdG9cbiAgICogW1tleGVjdXRlXV0gYW5kIFtbdW5wcmVwYXJlXV1cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgQSBbW1JlcXVlc3RdXSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0LlxuICAgKiAgIFBhcmFtZXRlcnMgb25seSByZXF1aXJlIGEgbmFtZSBhbmQgdHlwZS4gUGFyYW1ldGVyIHZhbHVlcyBhcmUgaWdub3JlZC5cbiAgICovXG4gIHByZXBhcmUocmVxdWVzdDogUmVxdWVzdCkge1xuICAgIGNvbnN0IHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdID0gW107XG5cbiAgICBwYXJhbWV0ZXJzLnB1c2goe1xuICAgICAgdHlwZTogVFlQRVMuSW50LFxuICAgICAgbmFtZTogJ2hhbmRsZScsXG4gICAgICB2YWx1ZTogdW5kZWZpbmVkLFxuICAgICAgb3V0cHV0OiB0cnVlLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgIHNjYWxlOiB1bmRlZmluZWRcbiAgICB9KTtcblxuICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5OVmFyQ2hhcixcbiAgICAgIG5hbWU6ICdwYXJhbXMnLFxuICAgICAgdmFsdWU6IHJlcXVlc3QucGFyYW1ldGVycy5sZW5ndGggPyByZXF1ZXN0Lm1ha2VQYXJhbXNQYXJhbWV0ZXIocmVxdWVzdC5wYXJhbWV0ZXJzKSA6IG51bGwsXG4gICAgICBvdXRwdXQ6IGZhbHNlLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgIHNjYWxlOiB1bmRlZmluZWRcbiAgICB9KTtcblxuICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5OVmFyQ2hhcixcbiAgICAgIG5hbWU6ICdzdG10JyxcbiAgICAgIHZhbHVlOiByZXF1ZXN0LnNxbFRleHRPclByb2NlZHVyZSxcbiAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgcmVxdWVzdC5wcmVwYXJpbmcgPSB0cnVlO1xuICAgIC8vIFRPRE86IFdlIG5lZWQgdG8gY2xlYW4gdXAgdGhpcyBldmVudCBoYW5kbGVyLCBvdGhlcndpc2UgdGhpcyBsZWFrcyBtZW1vcnlcbiAgICByZXF1ZXN0Lm9uKCdyZXR1cm5WYWx1ZScsIChuYW1lOiBzdHJpbmcsIHZhbHVlOiBhbnkpID0+IHtcbiAgICAgIGlmIChuYW1lID09PSAnaGFuZGxlJykge1xuICAgICAgICByZXF1ZXN0LmhhbmRsZSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdC5lcnJvciA9IG5ldyBSZXF1ZXN0RXJyb3IoYFRlZGlvdXMgPiBVbmV4cGVjdGVkIG91dHB1dCBwYXJhbWV0ZXIgJHtuYW1lfSBmcm9tIHNwX3ByZXBhcmVgKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5SUENfUkVRVUVTVCwgbmV3IFJwY1JlcXVlc3RQYXlsb2FkKCdzcF9wcmVwYXJlJywgcGFyYW1ldGVycywgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCksIHRoaXMuY29uZmlnLm9wdGlvbnMsIHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWxlYXNlIHRoZSBTUUwgU2VydmVyIHJlc291cmNlcyBhc3NvY2lhdGVkIHdpdGggYSBwcmV2aW91c2x5IHByZXBhcmVkIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IEEgW1tSZXF1ZXN0XV0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcmVxdWVzdC5cbiAgICogICBQYXJhbWV0ZXJzIG9ubHkgcmVxdWlyZSBhIG5hbWUgYW5kIHR5cGUuXG4gICAqICAgUGFyYW1ldGVyIHZhbHVlcyBhcmUgaWdub3JlZC5cbiAgICovXG4gIHVucHJlcGFyZShyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gICAgY29uc3QgcGFyYW1ldGVyczogUGFyYW1ldGVyW10gPSBbXTtcblxuICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5JbnQsXG4gICAgICBuYW1lOiAnaGFuZGxlJyxcbiAgICAgIC8vIFRPRE86IEFib3J0IGlmIGByZXF1ZXN0LmhhbmRsZWAgaXMgbm90IHNldFxuICAgICAgdmFsdWU6IHJlcXVlc3QuaGFuZGxlLFxuICAgICAgb3V0cHV0OiBmYWxzZSxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICBzY2FsZTogdW5kZWZpbmVkXG4gICAgfSk7XG5cbiAgICB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuUlBDX1JFUVVFU1QsIG5ldyBScGNSZXF1ZXN0UGF5bG9hZCgnc3BfdW5wcmVwYXJlJywgcGFyYW1ldGVycywgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCksIHRoaXMuY29uZmlnLm9wdGlvbnMsIHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIHByZXZpb3VzbHkgcHJlcGFyZWQgU1FMLCB1c2luZyB0aGUgc3VwcGxpZWQgcGFyYW1ldGVycy5cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgQSBwcmV2aW91c2x5IHByZXBhcmVkIFtbUmVxdWVzdF1dLlxuICAgKiBAcGFyYW0gcGFyYW1ldGVycyAgQW4gb2JqZWN0IHdob3NlIG5hbWVzIGNvcnJlc3BvbmQgdG8gdGhlIG5hbWVzIG9mXG4gICAqICAgcGFyYW1ldGVycyB0aGF0IHdlcmUgYWRkZWQgdG8gdGhlIFtbUmVxdWVzdF1dIGJlZm9yZSBpdCB3YXMgcHJlcGFyZWQuXG4gICAqICAgVGhlIG9iamVjdCdzIHZhbHVlcyBhcmUgcGFzc2VkIGFzIHRoZSBwYXJhbWV0ZXJzJyB2YWx1ZXMgd2hlbiB0aGVcbiAgICogICByZXF1ZXN0IGlzIGV4ZWN1dGVkLlxuICAgKi9cbiAgZXhlY3V0ZShyZXF1ZXN0OiBSZXF1ZXN0LCBwYXJhbWV0ZXJzPzogeyBba2V5OiBzdHJpbmddOiB1bmtub3duIH0pIHtcbiAgICBjb25zdCBleGVjdXRlUGFyYW1ldGVyczogUGFyYW1ldGVyW10gPSBbXTtcblxuICAgIGV4ZWN1dGVQYXJhbWV0ZXJzLnB1c2goe1xuICAgICAgdHlwZTogVFlQRVMuSW50LFxuICAgICAgbmFtZTogJ2hhbmRsZScsXG4gICAgICAvLyBUT0RPOiBBYm9ydCBpZiBgcmVxdWVzdC5oYW5kbGVgIGlzIG5vdCBzZXRcbiAgICAgIHZhbHVlOiByZXF1ZXN0LmhhbmRsZSxcbiAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSByZXF1ZXN0LnBhcmFtZXRlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3QgcGFyYW1ldGVyID0gcmVxdWVzdC5wYXJhbWV0ZXJzW2ldO1xuXG4gICAgICAgIGV4ZWN1dGVQYXJhbWV0ZXJzLnB1c2goe1xuICAgICAgICAgIC4uLnBhcmFtZXRlcixcbiAgICAgICAgICB2YWx1ZTogcGFyYW1ldGVyLnR5cGUudmFsaWRhdGUocGFyYW1ldGVycyA/IHBhcmFtZXRlcnNbcGFyYW1ldGVyLm5hbWVdIDogbnVsbCwgdGhpcy5kYXRhYmFzZUNvbGxhdGlvbilcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgcmVxdWVzdC5lcnJvciA9IGVycm9yO1xuXG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5kZWJ1Zy5sb2coZXJyb3IubWVzc2FnZSk7XG4gICAgICAgIHJlcXVlc3QuY2FsbGJhY2soZXJyb3IpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuUlBDX1JFUVVFU1QsIG5ldyBScGNSZXF1ZXN0UGF5bG9hZCgnc3BfZXhlY3V0ZScsIGV4ZWN1dGVQYXJhbWV0ZXJzLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucywgdGhpcy5kYXRhYmFzZUNvbGxhdGlvbikpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgYSBzdG9yZWQgcHJvY2VkdXJlIHJlcHJlc2VudGVkIGJ5IFtbUmVxdWVzdF1dLlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBBIFtbUmVxdWVzdF1dIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJlcXVlc3QuXG4gICAqL1xuICBjYWxsUHJvY2VkdXJlKHJlcXVlc3Q6IFJlcXVlc3QpIHtcbiAgICB0cnkge1xuICAgICAgcmVxdWVzdC52YWxpZGF0ZVBhcmFtZXRlcnModGhpcy5kYXRhYmFzZUNvbGxhdGlvbik7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgcmVxdWVzdC5lcnJvciA9IGVycm9yO1xuXG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5kZWJ1Zy5sb2coZXJyb3IubWVzc2FnZSk7XG4gICAgICAgIHJlcXVlc3QuY2FsbGJhY2soZXJyb3IpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuUlBDX1JFUVVFU1QsIG5ldyBScGNSZXF1ZXN0UGF5bG9hZChyZXF1ZXN0LnNxbFRleHRPclByb2NlZHVyZSEsIHJlcXVlc3QucGFyYW1ldGVycywgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCksIHRoaXMuY29uZmlnLm9wdGlvbnMsIHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCBhIHRyYW5zYWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHBhcmFtIG5hbWUgQSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgbmFtZSB0byBhc3NvY2lhdGUgd2l0aCB0aGUgdHJhbnNhY3Rpb24uXG4gICAqICAgT3B0aW9uYWwsIGFuZCBkZWZhdWx0cyB0byBhbiBlbXB0eSBzdHJpbmcuIFJlcXVpcmVkIHdoZW4gYGlzb2xhdGlvbkxldmVsYFxuICAgKiAgIGlzIHByZXNlbnQuXG4gICAqIEBwYXJhbSBpc29sYXRpb25MZXZlbCBUaGUgaXNvbGF0aW9uIGxldmVsIHRoYXQgdGhlIHRyYW5zYWN0aW9uIGlzIHRvIGJlIHJ1biB3aXRoLlxuICAgKlxuICAgKiAgIFRoZSBpc29sYXRpb24gbGV2ZWxzIGFyZSBhdmFpbGFibGUgZnJvbSBgcmVxdWlyZSgndGVkaW91cycpLklTT0xBVElPTl9MRVZFTGAuXG4gICAqICAgKiBgUkVBRF9VTkNPTU1JVFRFRGBcbiAgICogICAqIGBSRUFEX0NPTU1JVFRFRGBcbiAgICogICAqIGBSRVBFQVRBQkxFX1JFQURgXG4gICAqICAgKiBgU0VSSUFMSVpBQkxFYFxuICAgKiAgICogYFNOQVBTSE9UYFxuICAgKlxuICAgKiAgIE9wdGlvbmFsLCBhbmQgZGVmYXVsdHMgdG8gdGhlIENvbm5lY3Rpb24ncyBpc29sYXRpb24gbGV2ZWwuXG4gICAqL1xuICBiZWdpblRyYW5zYWN0aW9uKGNhbGxiYWNrOiBCZWdpblRyYW5zYWN0aW9uQ2FsbGJhY2ssIG5hbWUgPSAnJywgaXNvbGF0aW9uTGV2ZWwgPSB0aGlzLmNvbmZpZy5vcHRpb25zLmlzb2xhdGlvbkxldmVsKSB7XG4gICAgYXNzZXJ0VmFsaWRJc29sYXRpb25MZXZlbChpc29sYXRpb25MZXZlbCwgJ2lzb2xhdGlvbkxldmVsJyk7XG5cbiAgICBjb25zdCB0cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbihuYW1lLCBpc29sYXRpb25MZXZlbCk7XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy50ZHNWZXJzaW9uIDwgJzdfMicpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4ZWNTcWxCYXRjaChuZXcgUmVxdWVzdCgnU0VUIFRSQU5TQUNUSU9OIElTT0xBVElPTiBMRVZFTCAnICsgKHRyYW5zYWN0aW9uLmlzb2xhdGlvbkxldmVsVG9UU1FMKCkpICsgJztCRUdJTiBUUkFOICcgKyB0cmFuc2FjdGlvbi5uYW1lLCAoZXJyKSA9PiB7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb25EZXB0aCsrO1xuICAgICAgICBpZiAodGhpcy50cmFuc2FjdGlvbkRlcHRoID09PSAxKSB7XG4gICAgICAgICAgdGhpcy5pblRyYW5zYWN0aW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdCh1bmRlZmluZWQsIChlcnIpID0+IHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlRSQU5TQUNUSU9OX01BTkFHRVIsIHRyYW5zYWN0aW9uLmJlZ2luUGF5bG9hZCh0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbW1pdCBhIHRyYW5zYWN0aW9uLlxuICAgKlxuICAgKiBUaGVyZSBzaG91bGQgYmUgYW4gYWN0aXZlIHRyYW5zYWN0aW9uIC0gdGhhdCBpcywgW1tiZWdpblRyYW5zYWN0aW9uXV1cbiAgICogc2hvdWxkIGhhdmUgYmVlbiBwcmV2aW91c2x5IGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwYXJhbSBuYW1lIEEgc3RyaW5nIHJlcHJlc2VudGluZyBhIG5hbWUgdG8gYXNzb2NpYXRlIHdpdGggdGhlIHRyYW5zYWN0aW9uLlxuICAgKiAgIE9wdGlvbmFsLCBhbmQgZGVmYXVsdHMgdG8gYW4gZW1wdHkgc3RyaW5nLiBSZXF1aXJlZCB3aGVuIGBpc29sYXRpb25MZXZlbGBpcyBwcmVzZW50LlxuICAgKi9cbiAgY29tbWl0VHJhbnNhY3Rpb24oY2FsbGJhY2s6IENvbW1pdFRyYW5zYWN0aW9uQ2FsbGJhY2ssIG5hbWUgPSAnJykge1xuICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKG5hbWUpO1xuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY1NxbEJhdGNoKG5ldyBSZXF1ZXN0KCdDT01NSVQgVFJBTiAnICsgdHJhbnNhY3Rpb24ubmFtZSwgKGVycikgPT4ge1xuICAgICAgICB0aGlzLnRyYW5zYWN0aW9uRGVwdGgtLTtcbiAgICAgICAgaWYgKHRoaXMudHJhbnNhY3Rpb25EZXB0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuaW5UcmFuc2FjdGlvbiA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHVuZGVmaW5lZCwgY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuVFJBTlNBQ1RJT05fTUFOQUdFUiwgdHJhbnNhY3Rpb24uY29tbWl0UGF5bG9hZCh0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJvbGxiYWNrIGEgdHJhbnNhY3Rpb24uXG4gICAqXG4gICAqIFRoZXJlIHNob3VsZCBiZSBhbiBhY3RpdmUgdHJhbnNhY3Rpb24gLSB0aGF0IGlzLCBbW2JlZ2luVHJhbnNhY3Rpb25dXVxuICAgKiBzaG91bGQgaGF2ZSBiZWVuIHByZXZpb3VzbHkgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHBhcmFtIG5hbWUgQSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgbmFtZSB0byBhc3NvY2lhdGUgd2l0aCB0aGUgdHJhbnNhY3Rpb24uXG4gICAqICAgT3B0aW9uYWwsIGFuZCBkZWZhdWx0cyB0byBhbiBlbXB0eSBzdHJpbmcuXG4gICAqICAgUmVxdWlyZWQgd2hlbiBgaXNvbGF0aW9uTGV2ZWxgIGlzIHByZXNlbnQuXG4gICAqL1xuICByb2xsYmFja1RyYW5zYWN0aW9uKGNhbGxiYWNrOiBSb2xsYmFja1RyYW5zYWN0aW9uQ2FsbGJhY2ssIG5hbWUgPSAnJykge1xuICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKG5hbWUpO1xuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY1NxbEJhdGNoKG5ldyBSZXF1ZXN0KCdST0xMQkFDSyBUUkFOICcgKyB0cmFuc2FjdGlvbi5uYW1lLCAoZXJyKSA9PiB7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb25EZXB0aC0tO1xuICAgICAgICBpZiAodGhpcy50cmFuc2FjdGlvbkRlcHRoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHVuZGVmaW5lZCwgY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuVFJBTlNBQ1RJT05fTUFOQUdFUiwgdHJhbnNhY3Rpb24ucm9sbGJhY2tQYXlsb2FkKHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpKSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0IGEgc2F2ZXBvaW50IHdpdGhpbiBhIHRyYW5zYWN0aW9uLlxuICAgKlxuICAgKiBUaGVyZSBzaG91bGQgYmUgYW4gYWN0aXZlIHRyYW5zYWN0aW9uIC0gdGhhdCBpcywgW1tiZWdpblRyYW5zYWN0aW9uXV1cbiAgICogc2hvdWxkIGhhdmUgYmVlbiBwcmV2aW91c2x5IGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwYXJhbSBuYW1lIEEgc3RyaW5nIHJlcHJlc2VudGluZyBhIG5hbWUgdG8gYXNzb2NpYXRlIHdpdGggdGhlIHRyYW5zYWN0aW9uLlxcXG4gICAqICAgT3B0aW9uYWwsIGFuZCBkZWZhdWx0cyB0byBhbiBlbXB0eSBzdHJpbmcuXG4gICAqICAgUmVxdWlyZWQgd2hlbiBgaXNvbGF0aW9uTGV2ZWxgIGlzIHByZXNlbnQuXG4gICAqL1xuICBzYXZlVHJhbnNhY3Rpb24oY2FsbGJhY2s6IFNhdmVUcmFuc2FjdGlvbkNhbGxiYWNrLCBuYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCB0cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbihuYW1lKTtcbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy50ZHNWZXJzaW9uIDwgJzdfMicpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4ZWNTcWxCYXRjaChuZXcgUmVxdWVzdCgnU0FWRSBUUkFOICcgKyB0cmFuc2FjdGlvbi5uYW1lLCAoZXJyKSA9PiB7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb25EZXB0aCsrO1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QodW5kZWZpbmVkLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5UUkFOU0FDVElPTl9NQU5BR0VSLCB0cmFuc2FjdGlvbi5zYXZlUGF5bG9hZCh0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1biB0aGUgZ2l2ZW4gY2FsbGJhY2sgYWZ0ZXIgc3RhcnRpbmcgYSB0cmFuc2FjdGlvbiwgYW5kIGNvbW1pdCBvclxuICAgKiByb2xsYmFjayB0aGUgdHJhbnNhY3Rpb24gYWZ0ZXJ3YXJkcy5cbiAgICpcbiAgICogVGhpcyBpcyBhIGhlbHBlciB0aGF0IGVtcGxveXMgW1tiZWdpblRyYW5zYWN0aW9uXV0sIFtbY29tbWl0VHJhbnNhY3Rpb25dXSxcbiAgICogW1tyb2xsYmFja1RyYW5zYWN0aW9uXV0sIGFuZCBbW3NhdmVUcmFuc2FjdGlvbl1dIHRvIGdyZWF0bHkgc2ltcGxpZnkgdGhlXG4gICAqIHVzZSBvZiBkYXRhYmFzZSB0cmFuc2FjdGlvbnMgYW5kIGF1dG9tYXRpY2FsbHkgaGFuZGxlIHRyYW5zYWN0aW9uIG5lc3RpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBjYlxuICAgKiBAcGFyYW0gaXNvbGF0aW9uTGV2ZWxcbiAgICogICBUaGUgaXNvbGF0aW9uIGxldmVsIHRoYXQgdGhlIHRyYW5zYWN0aW9uIGlzIHRvIGJlIHJ1biB3aXRoLlxuICAgKlxuICAgKiAgIFRoZSBpc29sYXRpb24gbGV2ZWxzIGFyZSBhdmFpbGFibGUgZnJvbSBgcmVxdWlyZSgndGVkaW91cycpLklTT0xBVElPTl9MRVZFTGAuXG4gICAqICAgKiBgUkVBRF9VTkNPTU1JVFRFRGBcbiAgICogICAqIGBSRUFEX0NPTU1JVFRFRGBcbiAgICogICAqIGBSRVBFQVRBQkxFX1JFQURgXG4gICAqICAgKiBgU0VSSUFMSVpBQkxFYFxuICAgKiAgICogYFNOQVBTSE9UYFxuICAgKlxuICAgKiAgIE9wdGlvbmFsLCBhbmQgZGVmYXVsdHMgdG8gdGhlIENvbm5lY3Rpb24ncyBpc29sYXRpb24gbGV2ZWwuXG4gICAqL1xuICB0cmFuc2FjdGlvbihjYjogKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCB0eERvbmU/OiA8VCBleHRlbmRzIFRyYW5zYWN0aW9uRG9uZUNhbGxiYWNrPihlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgZG9uZTogVCwgLi4uYXJnczogQ2FsbGJhY2tQYXJhbWV0ZXJzPFQ+KSA9PiB2b2lkKSA9PiB2b2lkLCBpc29sYXRpb25MZXZlbD86IHR5cGVvZiBJU09MQVRJT05fTEVWRUxba2V5b2YgdHlwZW9mIElTT0xBVElPTl9MRVZFTF0pIHtcbiAgICBpZiAodHlwZW9mIGNiICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdgY2JgIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGNvbnN0IHVzZVNhdmVwb2ludCA9IHRoaXMuaW5UcmFuc2FjdGlvbjtcbiAgICBjb25zdCBuYW1lID0gJ190ZWRpb3VzXycgKyAoY3J5cHRvLnJhbmRvbUJ5dGVzKDEwKS50b1N0cmluZygnaGV4JykpO1xuICAgIGNvbnN0IHR4RG9uZTogPFQgZXh0ZW5kcyBUcmFuc2FjdGlvbkRvbmVDYWxsYmFjaz4oZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIGRvbmU6IFQsIC4uLmFyZ3M6IENhbGxiYWNrUGFyYW1ldGVyczxUPikgPT4gdm9pZCA9IChlcnIsIGRvbmUsIC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgaWYgKHRoaXMuaW5UcmFuc2FjdGlvbiAmJiB0aGlzLnN0YXRlID09PSB0aGlzLlNUQVRFLkxPR0dFRF9JTikge1xuICAgICAgICAgIHRoaXMucm9sbGJhY2tUcmFuc2FjdGlvbigodHhFcnIpID0+IHtcbiAgICAgICAgICAgIGRvbmUodHhFcnIgfHwgZXJyLCAuLi5hcmdzKTtcbiAgICAgICAgICB9LCBuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkb25lKGVyciwgLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodXNlU2F2ZXBvaW50KSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJykge1xuICAgICAgICAgIHRoaXMudHJhbnNhY3Rpb25EZXB0aC0tO1xuICAgICAgICB9XG4gICAgICAgIGRvbmUobnVsbCwgLi4uYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNvbW1pdFRyYW5zYWN0aW9uKCh0eEVycikgPT4ge1xuICAgICAgICAgIGRvbmUodHhFcnIsIC4uLmFyZ3MpO1xuICAgICAgICB9LCBuYW1lKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHVzZVNhdmVwb2ludCkge1xuICAgICAgcmV0dXJuIHRoaXMuc2F2ZVRyYW5zYWN0aW9uKChlcnIpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiBjYihlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzb2xhdGlvbkxldmVsKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZXhlY1NxbEJhdGNoKG5ldyBSZXF1ZXN0KCdTRVQgdHJhbnNhY3Rpb24gaXNvbGF0aW9uIGxldmVsICcgKyB0aGlzLmdldElzb2xhdGlvbkxldmVsVGV4dChpc29sYXRpb25MZXZlbCksIChlcnIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjYihlcnIsIHR4RG9uZSk7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBjYihudWxsLCB0eERvbmUpO1xuICAgICAgICB9XG4gICAgICB9LCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuYmVnaW5UcmFuc2FjdGlvbigoZXJyKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gY2IoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjYihudWxsLCB0eERvbmUpO1xuICAgICAgfSwgbmFtZSwgaXNvbGF0aW9uTGV2ZWwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgbWFrZVJlcXVlc3QocmVxdWVzdDogUmVxdWVzdCB8IEJ1bGtMb2FkLCBwYWNrZXRUeXBlOiBudW1iZXIsIHBheWxvYWQ6IChJdGVyYWJsZTxCdWZmZXI+IHwgQXN5bmNJdGVyYWJsZTxCdWZmZXI+KSAmIHsgdG9TdHJpbmc6IChpbmRlbnQ/OiBzdHJpbmcpID0+IHN0cmluZyB9KSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgIT09IHRoaXMuU1RBVEUuTE9HR0VEX0lOKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gJ1JlcXVlc3RzIGNhbiBvbmx5IGJlIG1hZGUgaW4gdGhlICcgKyB0aGlzLlNUQVRFLkxPR0dFRF9JTi5uYW1lICsgJyBzdGF0ZSwgbm90IHRoZSAnICsgdGhpcy5zdGF0ZS5uYW1lICsgJyBzdGF0ZSc7XG4gICAgICB0aGlzLmRlYnVnLmxvZyhtZXNzYWdlKTtcbiAgICAgIHJlcXVlc3QuY2FsbGJhY2sobmV3IFJlcXVlc3RFcnJvcihtZXNzYWdlLCAnRUlOVkFMSURTVEFURScpKTtcbiAgICB9IGVsc2UgaWYgKHJlcXVlc3QuY2FuY2VsZWQpIHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICByZXF1ZXN0LmNhbGxiYWNrKG5ldyBSZXF1ZXN0RXJyb3IoJ0NhbmNlbGVkLicsICdFQ0FOQ0VMJykpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChwYWNrZXRUeXBlID09PSBUWVBFLlNRTF9CQVRDSCkge1xuICAgICAgICB0aGlzLmlzU3FsQmF0Y2ggPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pc1NxbEJhdGNoID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgICByZXF1ZXN0LmNvbm5lY3Rpb24hID0gdGhpcztcbiAgICAgIHJlcXVlc3Qucm93Q291bnQhID0gMDtcbiAgICAgIHJlcXVlc3Qucm93cyEgPSBbXTtcbiAgICAgIHJlcXVlc3QucnN0ISA9IFtdO1xuXG4gICAgICBjb25zdCBvbkNhbmNlbCA9ICgpID0+IHtcbiAgICAgICAgcGF5bG9hZFN0cmVhbS51bnBpcGUobWVzc2FnZSk7XG4gICAgICAgIHBheWxvYWRTdHJlYW0uZGVzdHJveShuZXcgUmVxdWVzdEVycm9yKCdDYW5jZWxlZC4nLCAnRUNBTkNFTCcpKTtcblxuICAgICAgICAvLyBzZXQgdGhlIGlnbm9yZSBiaXQgYW5kIGVuZCB0aGUgbWVzc2FnZS5cbiAgICAgICAgbWVzc2FnZS5pZ25vcmUgPSB0cnVlO1xuICAgICAgICBtZXNzYWdlLmVuZCgpO1xuXG4gICAgICAgIGlmIChyZXF1ZXN0IGluc3RhbmNlb2YgUmVxdWVzdCAmJiByZXF1ZXN0LnBhdXNlZCkge1xuICAgICAgICAgIC8vIHJlc3VtZSB0aGUgcmVxdWVzdCBpZiBpdCB3YXMgcGF1c2VkIHNvIHdlIGNhbiByZWFkIHRoZSByZW1haW5pbmcgdG9rZW5zXG4gICAgICAgICAgcmVxdWVzdC5yZXN1bWUoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgcmVxdWVzdC5vbmNlKCdjYW5jZWwnLCBvbkNhbmNlbCk7XG5cbiAgICAgIHRoaXMuY3JlYXRlUmVxdWVzdFRpbWVyKCk7XG5cbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZSh7IHR5cGU6IHBhY2tldFR5cGUsIHJlc2V0Q29ubmVjdGlvbjogdGhpcy5yZXNldENvbm5lY3Rpb25Pbk5leHRSZXF1ZXN0IH0pO1xuICAgICAgdGhpcy5tZXNzYWdlSW8ub3V0Z29pbmdNZXNzYWdlU3RyZWFtLndyaXRlKG1lc3NhZ2UpO1xuICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0NMSUVOVF9SRVFVRVNUKTtcblxuICAgICAgbWVzc2FnZS5vbmNlKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgIHJlcXVlc3QucmVtb3ZlTGlzdGVuZXIoJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcbiAgICAgICAgcmVxdWVzdC5vbmNlKCdjYW5jZWwnLCB0aGlzLl9jYW5jZWxBZnRlclJlcXVlc3RTZW50KTtcblxuICAgICAgICB0aGlzLnJlc2V0Q29ubmVjdGlvbk9uTmV4dFJlcXVlc3QgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5kZWJ1Zy5wYXlsb2FkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBwYXlsb2FkIS50b1N0cmluZygnICAnKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcGF5bG9hZFN0cmVhbSA9IFJlYWRhYmxlLmZyb20ocGF5bG9hZCk7XG4gICAgICBwYXlsb2FkU3RyZWFtLm9uY2UoJ2Vycm9yJywgKGVycm9yKSA9PiB7XG4gICAgICAgIHBheWxvYWRTdHJlYW0udW5waXBlKG1lc3NhZ2UpO1xuXG4gICAgICAgIC8vIE9ubHkgc2V0IGEgcmVxdWVzdCBlcnJvciBpZiBubyBlcnJvciB3YXMgc2V0IHlldC5cbiAgICAgICAgcmVxdWVzdC5lcnJvciA/Pz0gZXJyb3I7XG5cbiAgICAgICAgbWVzc2FnZS5pZ25vcmUgPSB0cnVlO1xuICAgICAgICBtZXNzYWdlLmVuZCgpO1xuICAgICAgfSk7XG4gICAgICBwYXlsb2FkU3RyZWFtLnBpcGUobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbmNlbCBjdXJyZW50bHkgZXhlY3V0ZWQgcmVxdWVzdC5cbiAgICovXG4gIGNhbmNlbCgpIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJlcXVlc3QuY2FuY2VsZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLnJlcXVlc3QuY2FuY2VsKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXQgdGhlIGNvbm5lY3Rpb24gdG8gaXRzIGluaXRpYWwgc3RhdGUuXG4gICAqIENhbiBiZSB1c2VmdWwgZm9yIGNvbm5lY3Rpb24gcG9vbCBpbXBsZW1lbnRhdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKi9cbiAgcmVzZXQoY2FsbGJhY2s6IFJlc2V0Q2FsbGJhY2spIHtcbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QodGhpcy5nZXRJbml0aWFsU3FsKCksIChlcnIpID0+IHtcbiAgICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJykge1xuICAgICAgICB0aGlzLmluVHJhbnNhY3Rpb24gPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG4gICAgdGhpcy5yZXNldENvbm5lY3Rpb25Pbk5leHRSZXF1ZXN0ID0gdHJ1ZTtcbiAgICB0aGlzLmV4ZWNTcWxCYXRjaChyZXF1ZXN0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbkRlc2NyaXB0b3JzW3RoaXMudHJhbnNhY3Rpb25EZXNjcmlwdG9ycy5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZ2V0SXNvbGF0aW9uTGV2ZWxUZXh0KGlzb2xhdGlvbkxldmVsOiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMW2tleW9mIHR5cGVvZiBJU09MQVRJT05fTEVWRUxdKSB7XG4gICAgc3dpdGNoIChpc29sYXRpb25MZXZlbCkge1xuICAgICAgY2FzZSBJU09MQVRJT05fTEVWRUwuUkVBRF9VTkNPTU1JVFRFRDpcbiAgICAgICAgcmV0dXJuICdyZWFkIHVuY29tbWl0dGVkJztcbiAgICAgIGNhc2UgSVNPTEFUSU9OX0xFVkVMLlJFUEVBVEFCTEVfUkVBRDpcbiAgICAgICAgcmV0dXJuICdyZXBlYXRhYmxlIHJlYWQnO1xuICAgICAgY2FzZSBJU09MQVRJT05fTEVWRUwuU0VSSUFMSVpBQkxFOlxuICAgICAgICByZXR1cm4gJ3NlcmlhbGl6YWJsZSc7XG4gICAgICBjYXNlIElTT0xBVElPTl9MRVZFTC5TTkFQU0hPVDpcbiAgICAgICAgcmV0dXJuICdzbmFwc2hvdCc7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gJ3JlYWQgY29tbWl0dGVkJztcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNUcmFuc2llbnRFcnJvcihlcnJvcjogQWdncmVnYXRlRXJyb3IgfCBDb25uZWN0aW9uRXJyb3IpOiBib29sZWFuIHtcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgQWdncmVnYXRlRXJyb3IpIHtcbiAgICBlcnJvciA9IGVycm9yLmVycm9yc1swXTtcbiAgfVxuICByZXR1cm4gKGVycm9yIGluc3RhbmNlb2YgQ29ubmVjdGlvbkVycm9yKSAmJiAhIWVycm9yLmlzVHJhbnNpZW50O1xufVxuXG5leHBvcnQgZGVmYXVsdCBDb25uZWN0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBDb25uZWN0aW9uO1xuXG5Db25uZWN0aW9uLnByb3RvdHlwZS5TVEFURSA9IHtcbiAgSU5JVElBTElaRUQ6IHtcbiAgICBuYW1lOiAnSW5pdGlhbGl6ZWQnLFxuICAgIGV2ZW50czoge31cbiAgfSxcbiAgQ09OTkVDVElORzoge1xuICAgIG5hbWU6ICdDb25uZWN0aW5nJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmluaXRpYWxpc2VDb25uZWN0aW9uKCk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgY29ubmVjdFRpbWVvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFNFTlRfUFJFTE9HSU46IHtcbiAgICBuYW1lOiAnU2VudFByZWxvZ2luJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICBsZXQgbWVzc2FnZUJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcblxuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtZXNzYWdlID0gYXdhaXQgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIGF3YWl0IChjb25zdCBkYXRhIG9mIG1lc3NhZ2UpIHtcbiAgICAgICAgICBtZXNzYWdlQnVmZmVyID0gQnVmZmVyLmNvbmNhdChbbWVzc2FnZUJ1ZmZlciwgZGF0YV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJlbG9naW5QYXlsb2FkID0gbmV3IFByZWxvZ2luUGF5bG9hZChtZXNzYWdlQnVmZmVyKTtcbiAgICAgICAgdGhpcy5kZWJ1Zy5wYXlsb2FkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBwcmVsb2dpblBheWxvYWQudG9TdHJpbmcoJyAgJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChwcmVsb2dpblBheWxvYWQuZmVkQXV0aFJlcXVpcmVkID09PSAxKSB7XG4gICAgICAgICAgdGhpcy5mZWRBdXRoUmVxdWlyZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByZWxvZ2luUGF5bG9hZC5lbmNyeXB0aW9uU3RyaW5nID09PSAnT04nIHx8IHByZWxvZ2luUGF5bG9hZC5lbmNyeXB0aW9uU3RyaW5nID09PSAnUkVRJykge1xuICAgICAgICAgIGlmICghdGhpcy5jb25maWcub3B0aW9ucy5lbmNyeXB0KSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnLCBuZXcgQ29ubmVjdGlvbkVycm9yKFwiU2VydmVyIHJlcXVpcmVzIGVuY3J5cHRpb24sIHNldCAnZW5jcnlwdCcgY29uZmlnIG9wdGlvbiB0byB0cnVlLlwiLCAnRUVOQ1JZUFQnKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfVExTU1NMTkVHT1RJQVRJT04pO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5tZXNzYWdlSW8uc3RhcnRUbHModGhpcy5zZWN1cmVDb250ZXh0T3B0aW9ucywgdGhpcy5yb3V0aW5nRGF0YT8uc2VydmVyID8/IHRoaXMuY29uZmlnLnNlcnZlciwgdGhpcy5jb25maWcub3B0aW9ucy50cnVzdFNlcnZlckNlcnRpZmljYXRlKTtcbiAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc29ja2V0RXJyb3IoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNlbmRMb2dpbjdQYWNrZXQoKTtcblxuICAgICAgICBjb25zdCB7IGF1dGhlbnRpY2F0aW9uIH0gPSB0aGlzLmNvbmZpZztcblxuICAgICAgICBzd2l0Y2ggKGF1dGhlbnRpY2F0aW9uLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJzpcbiAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bSc6XG4gICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnOlxuICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3Rvcnktc2VydmljZS1wcmluY2lwYWwtc2VjcmV0JzpcbiAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnOlxuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0xPR0lON19XSVRIX0ZFREFVVEgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbnRsbSc6XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfTE9HSU43X1dJVEhfTlRMTSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0xPR0lON19XSVRIX1NUQU5EQVJEX0xPR0lOKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9KSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RUaW1lb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBSRVJPVVRJTkc6IHtcbiAgICBuYW1lOiAnUmVSb3V0aW5nJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNsZWFudXBDb25uZWN0aW9uKENMRUFOVVBfVFlQRS5SRURJUkVDVCk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIG1lc3NhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgfSxcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgY29ubmVjdFRpbWVvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICByZWNvbm5lY3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkNPTk5FQ1RJTkcpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgVFJBTlNJRU5UX0ZBSUxVUkVfUkVUUlk6IHtcbiAgICBuYW1lOiAnVFJBTlNJRU5UX0ZBSUxVUkVfUkVUUlknLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY3VyVHJhbnNpZW50UmV0cnlDb3VudCsrO1xuICAgICAgdGhpcy5jbGVhbnVwQ29ubmVjdGlvbihDTEVBTlVQX1RZUEUuUkVUUlkpO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBtZXNzYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgIH0sXG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RUaW1lb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgcmV0cnk6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNyZWF0ZVJldHJ5VGltZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFNFTlRfVExTU1NMTkVHT1RJQVRJT046IHtcbiAgICBuYW1lOiAnU2VudFRMU1NTTE5lZ290aWF0aW9uJyxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgY29ubmVjdFRpbWVvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFNFTlRfTE9HSU43X1dJVEhfU1RBTkRBUkRfTE9HSU46IHtcbiAgICBuYW1lOiAnU2VudExvZ2luN1dpdGhTdGFuZGFyZExvZ2luJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtZXNzYWdlID0gYXdhaXQgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IG5ldyBMb2dpbjdUb2tlbkhhbmRsZXIodGhpcyk7XG4gICAgICAgIGNvbnN0IHRva2VuU3RyZWFtUGFyc2VyID0gdGhpcy5jcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCBoYW5kbGVyKTtcblxuICAgICAgICBhd2FpdCBvbmNlKHRva2VuU3RyZWFtUGFyc2VyLCAnZW5kJyk7XG5cbiAgICAgICAgaWYgKGhhbmRsZXIubG9naW5BY2tSZWNlaXZlZCkge1xuICAgICAgICAgIGlmIChoYW5kbGVyLnJvdXRpbmdEYXRhKSB7XG4gICAgICAgICAgICB0aGlzLnJvdXRpbmdEYXRhID0gaGFuZGxlci5yb3V0aW5nRGF0YTtcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuUkVST1VUSU5HKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5MT0dHRURfSU5fU0VORElOR19JTklUSUFMX1NRTCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubG9naW5FcnJvcikge1xuICAgICAgICAgIGlmIChpc1RyYW5zaWVudEVycm9yKHRoaXMubG9naW5FcnJvcikpIHtcbiAgICAgICAgICAgIHRoaXMuZGVidWcubG9nKCdJbml0aWF0aW5nIHJldHJ5IG9uIHRyYW5zaWVudCBlcnJvcicpO1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5UUkFOU0lFTlRfRkFJTFVSRV9SRVRSWSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIHRoaXMubG9naW5FcnJvcik7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0JywgbmV3IENvbm5lY3Rpb25FcnJvcignTG9naW4gZmFpbGVkLicsICdFTE9HSU4nKSk7XG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICAgIH1cbiAgICAgIH0pKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgY29ubmVjdFRpbWVvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFNFTlRfTE9HSU43X1dJVEhfTlRMTToge1xuICAgIG5hbWU6ICdTZW50TG9naW43V2l0aE5UTE1Mb2dpbicsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWVzc2FnZSA9IGF3YWl0IHRoaXMubWVzc2FnZUlvLnJlYWRNZXNzYWdlKCk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNvY2tldEVycm9yKGVycik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgaGFuZGxlciA9IG5ldyBMb2dpbjdUb2tlbkhhbmRsZXIodGhpcyk7XG4gICAgICAgICAgY29uc3QgdG9rZW5TdHJlYW1QYXJzZXIgPSB0aGlzLmNyZWF0ZVRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2UsIGhhbmRsZXIpO1xuXG4gICAgICAgICAgYXdhaXQgb25jZSh0b2tlblN0cmVhbVBhcnNlciwgJ2VuZCcpO1xuXG4gICAgICAgICAgaWYgKGhhbmRsZXIubG9naW5BY2tSZWNlaXZlZCkge1xuICAgICAgICAgICAgaWYgKGhhbmRsZXIucm91dGluZ0RhdGEpIHtcbiAgICAgICAgICAgICAgdGhpcy5yb3V0aW5nRGF0YSA9IGhhbmRsZXIucm91dGluZ0RhdGE7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlJFUk9VVElORyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5MT0dHRURfSU5fU0VORElOR19JTklUSUFMX1NRTCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLm50bG1wYWNrZXQpIHtcbiAgICAgICAgICAgIGNvbnN0IGF1dGhlbnRpY2F0aW9uID0gdGhpcy5jb25maWcuYXV0aGVudGljYXRpb24gYXMgTnRsbUF1dGhlbnRpY2F0aW9uO1xuXG4gICAgICAgICAgICBjb25zdCBwYXlsb2FkID0gbmV3IE5UTE1SZXNwb25zZVBheWxvYWQoe1xuICAgICAgICAgICAgICBkb21haW46IGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuZG9tYWluLFxuICAgICAgICAgICAgICB1c2VyTmFtZTogYXV0aGVudGljYXRpb24ub3B0aW9ucy51c2VyTmFtZSxcbiAgICAgICAgICAgICAgcGFzc3dvcmQ6IGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMucGFzc3dvcmQsXG4gICAgICAgICAgICAgIG50bG1wYWNrZXQ6IHRoaXMubnRsbXBhY2tldFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMubWVzc2FnZUlvLnNlbmRNZXNzYWdlKFRZUEUuTlRMTUFVVEhfUEtULCBwYXlsb2FkLmRhdGEpO1xuICAgICAgICAgICAgdGhpcy5kZWJ1Zy5wYXlsb2FkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gcGF5bG9hZC50b1N0cmluZygnICAnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLm50bG1wYWNrZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxvZ2luRXJyb3IpIHtcbiAgICAgICAgICAgIGlmIChpc1RyYW5zaWVudEVycm9yKHRoaXMubG9naW5FcnJvcikpIHtcbiAgICAgICAgICAgICAgdGhpcy5kZWJ1Zy5sb2coJ0luaXRpYXRpbmcgcmV0cnkgb24gdHJhbnNpZW50IGVycm9yJyk7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlRSQU5TSUVOVF9GQUlMVVJFX1JFVFJZKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIHRoaXMubG9naW5FcnJvcik7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0JywgbmV3IENvbm5lY3Rpb25FcnJvcignTG9naW4gZmFpbGVkLicsICdFTE9HSU4nKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH0pKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgY29ubmVjdFRpbWVvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFNFTlRfTE9HSU43X1dJVEhfRkVEQVVUSDoge1xuICAgIG5hbWU6ICdTZW50TG9naW43V2l0aGZlZGF1dGgnLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBhd2FpdCB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnNvY2tldEVycm9yKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYW5kbGVyID0gbmV3IExvZ2luN1Rva2VuSGFuZGxlcih0aGlzKTtcbiAgICAgICAgY29uc3QgdG9rZW5TdHJlYW1QYXJzZXIgPSB0aGlzLmNyZWF0ZVRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2UsIGhhbmRsZXIpO1xuICAgICAgICBhd2FpdCBvbmNlKHRva2VuU3RyZWFtUGFyc2VyLCAnZW5kJyk7XG4gICAgICAgIGlmIChoYW5kbGVyLmxvZ2luQWNrUmVjZWl2ZWQpIHtcbiAgICAgICAgICBpZiAoaGFuZGxlci5yb3V0aW5nRGF0YSkge1xuICAgICAgICAgICAgdGhpcy5yb3V0aW5nRGF0YSA9IGhhbmRsZXIucm91dGluZ0RhdGE7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlJFUk9VVElORyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuTE9HR0VEX0lOX1NFTkRJTkdfSU5JVElBTF9TUUwpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZlZEF1dGhJbmZvVG9rZW4gPSBoYW5kbGVyLmZlZEF1dGhJbmZvVG9rZW47XG5cbiAgICAgICAgaWYgKGZlZEF1dGhJbmZvVG9rZW4gJiYgZmVkQXV0aEluZm9Ub2tlbi5zdHN1cmwgJiYgZmVkQXV0aEluZm9Ub2tlbi5zcG4pIHtcbiAgICAgICAgICBjb25zdCBhdXRoZW50aWNhdGlvbiA9IHRoaXMuY29uZmlnLmF1dGhlbnRpY2F0aW9uIGFzIEF6dXJlQWN0aXZlRGlyZWN0b3J5UGFzc3dvcmRBdXRoZW50aWNhdGlvbiB8IEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpVm1BdXRoZW50aWNhdGlvbiB8IEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpQXBwU2VydmljZUF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlTZXJ2aWNlUHJpbmNpcGFsU2VjcmV0IHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlEZWZhdWx0QXV0aGVudGljYXRpb247XG4gICAgICAgICAgY29uc3QgdG9rZW5TY29wZSA9IG5ldyBVUkwoJy8uZGVmYXVsdCcsIGZlZEF1dGhJbmZvVG9rZW4uc3BuKS50b1N0cmluZygpO1xuXG4gICAgICAgICAgbGV0IGNyZWRlbnRpYWxzO1xuXG4gICAgICAgICAgc3dpdGNoIChhdXRoZW50aWNhdGlvbi50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJzpcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bSc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZSc6XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0JzpcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCc6XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCB0b2tlblJlc3BvbnNlO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0b2tlblJlc3BvbnNlID0gYXdhaXQgY3JlZGVudGlhbHMuZ2V0VG9rZW4odG9rZW5TY29wZSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2luRXJyb3IgPSBuZXcgQWdncmVnYXRlRXJyb3IoXG4gICAgICAgICAgICAgIFtuZXcgQ29ubmVjdGlvbkVycm9yKCdTZWN1cml0eSB0b2tlbiBjb3VsZCBub3QgYmUgYXV0aGVudGljYXRlZCBvciBhdXRob3JpemVkLicsICdFRkVEQVVUSCcpLCBlcnJdKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIHRoaXMubG9naW5FcnJvcik7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cblxuICAgICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5SZXNwb25zZS50b2tlbjtcbiAgICAgICAgICB0aGlzLnNlbmRGZWRBdXRoVG9rZW5NZXNzYWdlKHRva2VuKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubG9naW5FcnJvcikge1xuICAgICAgICAgIGlmIChpc1RyYW5zaWVudEVycm9yKHRoaXMubG9naW5FcnJvcikpIHtcbiAgICAgICAgICAgIHRoaXMuZGVidWcubG9nKCdJbml0aWF0aW5nIHJldHJ5IG9uIHRyYW5zaWVudCBlcnJvcicpO1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5UUkFOU0lFTlRfRkFJTFVSRV9SRVRSWSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIHRoaXMubG9naW5FcnJvcik7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0JywgbmV3IENvbm5lY3Rpb25FcnJvcignTG9naW4gZmFpbGVkLicsICdFTE9HSU4nKSk7XG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICAgIH1cblxuICAgICAgfSkoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgTE9HR0VEX0lOX1NFTkRJTkdfSU5JVElBTF9TUUw6IHtcbiAgICBuYW1lOiAnTG9nZ2VkSW5TZW5kaW5nSW5pdGlhbFNxbCcsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5zZW5kSW5pdGlhbFNxbCgpO1xuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtZXNzYWdlID0gYXdhaXQgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRva2VuU3RyZWFtUGFyc2VyID0gdGhpcy5jcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCBuZXcgSW5pdGlhbFNxbFRva2VuSGFuZGxlcih0aGlzKSk7XG4gICAgICAgIGF3YWl0IG9uY2UodG9rZW5TdHJlYW1QYXJzZXIsICdlbmQnKTtcblxuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTik7XG4gICAgICAgIHRoaXMucHJvY2Vzc2VkSW5pdGlhbFNxbCgpO1xuXG4gICAgICB9KSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24gc29ja2V0RXJyb3IoKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RUaW1lb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBMT0dHRURfSU46IHtcbiAgICBuYW1lOiAnTG9nZ2VkSW4nLFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFNFTlRfQ0xJRU5UX1JFUVVFU1Q6IHtcbiAgICBuYW1lOiAnU2VudENsaWVudFJlcXVlc3QnLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBhd2FpdCB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnNvY2tldEVycm9yKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVxdWVzdCB0aW1lciBpcyBzdG9wcGVkIG9uIGZpcnN0IGRhdGEgcGFja2FnZVxuICAgICAgICB0aGlzLmNsZWFyUmVxdWVzdFRpbWVyKCk7XG5cbiAgICAgICAgY29uc3QgdG9rZW5TdHJlYW1QYXJzZXIgPSB0aGlzLmNyZWF0ZVRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2UsIG5ldyBSZXF1ZXN0VG9rZW5IYW5kbGVyKHRoaXMsIHRoaXMucmVxdWVzdCEpKTtcblxuICAgICAgICAvLyBJZiB0aGUgcmVxdWVzdCB3YXMgY2FuY2VsZWQgYW5kIHdlIGhhdmUgYSBgY2FuY2VsVGltZXJgXG4gICAgICAgIC8vIGRlZmluZWQsIHdlIHNlbmQgYSBhdHRlbnRpb24gbWVzc2FnZSBhZnRlciB0aGVcbiAgICAgICAgLy8gcmVxdWVzdCBtZXNzYWdlIHdhcyBmdWxseSBzZW50IG9mZi5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gV2UgYWxyZWFkeSBzdGFydGVkIGNvbnN1bWluZyB0aGUgY3VycmVudCBtZXNzYWdlXG4gICAgICAgIC8vIChidXQgYWxsIHRoZSB0b2tlbiBoYW5kbGVycyBzaG91bGQgYmUgbm8tb3BzKSwgYW5kXG4gICAgICAgIC8vIG5lZWQgdG8gZW5zdXJlIHRoZSBuZXh0IG1lc3NhZ2UgaXMgaGFuZGxlZCBieSB0aGVcbiAgICAgICAgLy8gYFNFTlRfQVRURU5USU9OYCBzdGF0ZS5cbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdD8uY2FuY2VsZWQgJiYgdGhpcy5jYW5jZWxUaW1lcikge1xuICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfQVRURU5USU9OKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9uUmVzdW1lID0gKCkgPT4ge1xuICAgICAgICAgIHRva2VuU3RyZWFtUGFyc2VyLnJlc3VtZSgpO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBvblBhdXNlID0gKCkgPT4ge1xuICAgICAgICAgIHRva2VuU3RyZWFtUGFyc2VyLnBhdXNlKCk7XG5cbiAgICAgICAgICB0aGlzLnJlcXVlc3Q/Lm9uY2UoJ3Jlc3VtZScsIG9uUmVzdW1lKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnJlcXVlc3Q/Lm9uKCdwYXVzZScsIG9uUGF1c2UpO1xuXG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QgaW5zdGFuY2VvZiBSZXF1ZXN0ICYmIHRoaXMucmVxdWVzdC5wYXVzZWQpIHtcbiAgICAgICAgICBvblBhdXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbkNhbmNlbCA9ICgpID0+IHtcbiAgICAgICAgICB0b2tlblN0cmVhbVBhcnNlci5yZW1vdmVMaXN0ZW5lcignZW5kJywgb25FbmRPZk1lc3NhZ2UpO1xuXG4gICAgICAgICAgaWYgKHRoaXMucmVxdWVzdCBpbnN0YW5jZW9mIFJlcXVlc3QgJiYgdGhpcy5yZXF1ZXN0LnBhdXNlZCkge1xuICAgICAgICAgICAgLy8gcmVzdW1lIHRoZSByZXF1ZXN0IGlmIGl0IHdhcyBwYXVzZWQgc28gd2UgY2FuIHJlYWQgdGhlIHJlbWFpbmluZyB0b2tlbnNcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC5yZXN1bWUoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLnJlcXVlc3Q/LnJlbW92ZUxpc3RlbmVyKCdwYXVzZScsIG9uUGF1c2UpO1xuICAgICAgICAgIHRoaXMucmVxdWVzdD8ucmVtb3ZlTGlzdGVuZXIoJ3Jlc3VtZScsIG9uUmVzdW1lKTtcblxuICAgICAgICAgIC8vIFRoZSBgX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnRgIGNhbGxiYWNrIHdpbGwgaGF2ZSBzZW50IGFcbiAgICAgICAgICAvLyBhdHRlbnRpb24gbWVzc2FnZSwgc28gbm93IHdlIG5lZWQgdG8gYWxzbyBzd2l0Y2ggdG9cbiAgICAgICAgICAvLyB0aGUgYFNFTlRfQVRURU5USU9OYCBzdGF0ZSB0byBtYWtlIHN1cmUgdGhlIGF0dGVudGlvbiBhY2tcbiAgICAgICAgICAvLyBtZXNzYWdlIGlzIHByb2Nlc3NlZCBjb3JyZWN0bHkuXG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0FUVEVOVElPTik7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgb25FbmRPZk1lc3NhZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5yZW1vdmVMaXN0ZW5lcignY2FuY2VsJywgdGhpcy5fY2FuY2VsQWZ0ZXJSZXF1ZXN0U2VudCk7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5yZW1vdmVMaXN0ZW5lcignY2FuY2VsJywgb25DYW5jZWwpO1xuICAgICAgICAgIHRoaXMucmVxdWVzdD8ucmVtb3ZlTGlzdGVuZXIoJ3BhdXNlJywgb25QYXVzZSk7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5yZW1vdmVMaXN0ZW5lcigncmVzdW1lJywgb25SZXN1bWUpO1xuXG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5MT0dHRURfSU4pO1xuICAgICAgICAgIGNvbnN0IHNxbFJlcXVlc3QgPSB0aGlzLnJlcXVlc3QgYXMgUmVxdWVzdDtcbiAgICAgICAgICB0aGlzLnJlcXVlc3QgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInICYmIHNxbFJlcXVlc3QuZXJyb3IgJiYgdGhpcy5pc1NxbEJhdGNoKSB7XG4gICAgICAgICAgICB0aGlzLmluVHJhbnNhY3Rpb24gPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhzcWxSZXF1ZXN0LmVycm9yLCBzcWxSZXF1ZXN0LnJvd0NvdW50LCBzcWxSZXF1ZXN0LnJvd3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRva2VuU3RyZWFtUGFyc2VyLm9uY2UoJ2VuZCcsIG9uRW5kT2ZNZXNzYWdlKTtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Py5vbmNlKCdjYW5jZWwnLCBvbkNhbmNlbCk7XG4gICAgICB9KSgpO1xuXG4gICAgfSxcbiAgICBleGl0OiBmdW5jdGlvbihuZXh0U3RhdGUpIHtcbiAgICAgIHRoaXMuY2xlYXJSZXF1ZXN0VGltZXIoKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKGVycikge1xuICAgICAgICBjb25zdCBzcWxSZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0ITtcbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcblxuICAgICAgICBzcWxSZXF1ZXN0LmNhbGxiYWNrKGVycik7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBTRU5UX0FUVEVOVElPTjoge1xuICAgIG5hbWU6ICdTZW50QXR0ZW50aW9uJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtZXNzYWdlID0gYXdhaXQgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IG5ldyBBdHRlbnRpb25Ub2tlbkhhbmRsZXIodGhpcywgdGhpcy5yZXF1ZXN0ISk7XG4gICAgICAgIGNvbnN0IHRva2VuU3RyZWFtUGFyc2VyID0gdGhpcy5jcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCBoYW5kbGVyKTtcblxuICAgICAgICBhd2FpdCBvbmNlKHRva2VuU3RyZWFtUGFyc2VyLCAnZW5kJyk7XG4gICAgICAgIC8vIDMuMi41LjcgU2VudCBBdHRlbnRpb24gU3RhdGVcbiAgICAgICAgLy8gRGlzY2FyZCBhbnkgZGF0YSBjb250YWluZWQgaW4gdGhlIHJlc3BvbnNlLCB1bnRpbCB3ZSByZWNlaXZlIHRoZSBhdHRlbnRpb24gcmVzcG9uc2VcbiAgICAgICAgaWYgKGhhbmRsZXIuYXR0ZW50aW9uUmVjZWl2ZWQpIHtcbiAgICAgICAgICB0aGlzLmNsZWFyQ2FuY2VsVGltZXIoKTtcblxuICAgICAgICAgIGNvbnN0IHNxbFJlcXVlc3QgPSB0aGlzLnJlcXVlc3QhO1xuICAgICAgICAgIHRoaXMucmVxdWVzdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTik7XG5cbiAgICAgICAgICBpZiAoc3FsUmVxdWVzdC5lcnJvciAmJiBzcWxSZXF1ZXN0LmVycm9yIGluc3RhbmNlb2YgUmVxdWVzdEVycm9yICYmIHNxbFJlcXVlc3QuZXJyb3IuY29kZSA9PT0gJ0VUSU1FT1VUJykge1xuICAgICAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhzcWxSZXF1ZXN0LmVycm9yKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhuZXcgUmVxdWVzdEVycm9yKCdDYW5jZWxlZC4nLCAnRUNBTkNFTCcpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSkoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKGVycikge1xuICAgICAgICBjb25zdCBzcWxSZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0ITtcbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuXG4gICAgICAgIHNxbFJlcXVlc3QuY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIEZJTkFMOiB7XG4gICAgbmFtZTogJ0ZpbmFsJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNsZWFudXBDb25uZWN0aW9uKENMRUFOVVBfVFlQRS5OT1JNQUwpO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIERvIG5vdGhpbmcsIGFzIHRoZSB0aW1lciBzaG91bGQgYmUgY2xlYW5lZCB1cC5cbiAgICAgIH0sXG4gICAgICBtZXNzYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgfSxcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUVBOztBQUVBOztBQUdBOztBQUVBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUVBOztBQUVBOztBQUNBOztBQUNBOztBQUdBOztBQUNBOztBQUNBOztBQUNBOzs7O0FBb0dBO0FBQ0E7QUFDQTtB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