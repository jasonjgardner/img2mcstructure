var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});

// node_modules/nbtify/dist/primitive.js
var CustomInspect, Int8, Int16, Int32, Float32;
var init_primitive = __esm({
  "node_modules/nbtify/dist/primitive.js"() {
    CustomInspect = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
    Int8 = class extends Number {
      constructor(value) {
        super(value << 24 >> 24);
      }
      valueOf() {
        return super.valueOf();
      }
      get [Symbol.toStringTag]() {
        return "Int8";
      }
      /**
       * @internal
      */
      get [CustomInspect]() {
        return (_, { stylize }) => stylize(`${this.valueOf()}b`, "number");
      }
    };
    Int16 = class extends Number {
      constructor(value) {
        super(value << 16 >> 16);
      }
      valueOf() {
        return super.valueOf();
      }
      get [Symbol.toStringTag]() {
        return "Int16";
      }
      /**
       * @internal
      */
      get [CustomInspect]() {
        return (_, { stylize }) => stylize(`${this.valueOf()}s`, "number");
      }
    };
    Int32 = class extends Number {
      constructor(value) {
        super(value | 0);
      }
      valueOf() {
        return super.valueOf();
      }
      get [Symbol.toStringTag]() {
        return "Int32";
      }
      /**
       * @internal
      */
      get [CustomInspect]() {
        return () => this.valueOf();
      }
    };
    Float32 = class extends Number {
      constructor(value) {
        super(value);
      }
      valueOf() {
        return super.valueOf();
      }
      get [Symbol.toStringTag]() {
        return "Float32";
      }
      /**
       * @internal
      */
      get [CustomInspect]() {
        return (_, { stylize }) => stylize(`${this.valueOf()}f`, "number");
      }
    };
  }
});

// node_modules/nbtify/dist/format.js
function isRootTagLike(data) {
  if (typeof data !== "object" || data === null) {
    throw new TypeError("Root Tag must be an object or array");
  }
  data;
}
function isRootName(rootName) {
  if (typeof rootName !== "string" && rootName !== null) {
    throw new TypeError("Root Name must be a string or null");
  }
  rootName;
}
function isEndian(endian) {
  if (endian !== "big" && endian !== "little") {
    throw new TypeError("Endian must be 'big' or 'little'");
  }
  endian;
}
function isCompression(compression) {
  if (compression !== "deflate" && compression !== "deflate-raw" && compression !== "gzip" && compression !== null) {
    throw new TypeError("Compression must be 'deflate', 'deflate-raw', 'gzip', or null");
  }
  compression;
}
function isBedrockLevel(bedrockLevel) {
  if (typeof bedrockLevel !== "boolean") {
    throw new TypeError("Bedrock Level must be a boolean");
  }
  bedrockLevel;
}
var NBTData;
var init_format = __esm({
  "node_modules/nbtify/dist/format.js"() {
    init_primitive();
    NBTData = class _NBTData {
      constructor(data, options = {}) {
        __publicField(this, "data");
        __publicField(this, "rootName");
        __publicField(this, "endian");
        __publicField(this, "compression");
        __publicField(this, "bedrockLevel");
        if (data instanceof _NBTData) {
          if (options.rootName === void 0) {
            options.rootName = data.rootName;
          }
          if (options.endian === void 0) {
            options.endian = data.endian;
          }
          if (options.compression === void 0) {
            options.compression = data.compression;
          }
          if (options.bedrockLevel === void 0) {
            options.bedrockLevel = data.bedrockLevel;
          }
          data = data.data;
        }
        const { rootName = "", endian = "big", compression = null, bedrockLevel = false } = options;
        isRootTagLike(data);
        isRootName(rootName);
        isEndian(endian);
        isCompression(compression);
        isBedrockLevel(bedrockLevel);
        this.data = data;
        this.rootName = rootName;
        this.endian = endian;
        this.compression = compression;
        this.bedrockLevel = bedrockLevel;
        if (this.bedrockLevel) {
          if (this.endian !== "little") {
            throw new TypeError("Endian option must be 'little' when the Bedrock Level flag is enabled");
          }
          if (!("StorageVersion" in data) || !(data.StorageVersion instanceof Int32)) {
            throw new TypeError("Expected a 'StorageVersion' Int tag when Bedrock Level flag is enabled");
          }
        }
        for (const property of ["data", "rootName", "endian", "compression", "bedrockLevel"]) {
          let enumerable = true;
          switch (property) {
            case "compression":
              enumerable = compression !== null;
              break;
            case "bedrockLevel":
              enumerable = bedrockLevel;
              break;
          }
          Object.defineProperty(this, property, {
            configurable: true,
            enumerable,
            writable: false
          });
        }
      }
      get [Symbol.toStringTag]() {
        return "NBTData";
      }
    };
  }
});

// node_modules/nbtify/dist/tag.js
function isTag(value) {
  return getTagType(value) !== null;
}
function getTagType(value) {
  switch (true) {
    case value instanceof Int8:
    case typeof value === "boolean":
      return TAG.BYTE;
    case value instanceof Int16:
      return TAG.SHORT;
    case value instanceof Int32:
      return TAG.INT;
    case typeof value === "bigint":
      return TAG.LONG;
    case value instanceof Float32:
      return TAG.FLOAT;
    case typeof value === "number":
      return TAG.DOUBLE;
    case value instanceof Int8Array:
      return TAG.BYTE_ARRAY;
    case typeof value === "string":
      return TAG.STRING;
    case value instanceof Array:
      return TAG.LIST;
    case value instanceof Int32Array:
      return TAG.INT_ARRAY;
    case value instanceof BigInt64Array:
      return TAG.LONG_ARRAY;
    case (typeof value === "object" && value !== null):
      return TAG.COMPOUND;
    default:
      return null;
  }
}
var TAG, TAG_TYPE;
var init_tag = __esm({
  "node_modules/nbtify/dist/tag.js"() {
    init_primitive();
    (function(TAG2) {
      TAG2[TAG2["END"] = 0] = "END";
      TAG2[TAG2["BYTE"] = 1] = "BYTE";
      TAG2[TAG2["SHORT"] = 2] = "SHORT";
      TAG2[TAG2["INT"] = 3] = "INT";
      TAG2[TAG2["LONG"] = 4] = "LONG";
      TAG2[TAG2["FLOAT"] = 5] = "FLOAT";
      TAG2[TAG2["DOUBLE"] = 6] = "DOUBLE";
      TAG2[TAG2["BYTE_ARRAY"] = 7] = "BYTE_ARRAY";
      TAG2[TAG2["STRING"] = 8] = "STRING";
      TAG2[TAG2["LIST"] = 9] = "LIST";
      TAG2[TAG2["COMPOUND"] = 10] = "COMPOUND";
      TAG2[TAG2["INT_ARRAY"] = 11] = "INT_ARRAY";
      TAG2[TAG2["LONG_ARRAY"] = 12] = "LONG_ARRAY";
    })(TAG || (TAG = {}));
    Object.freeze(TAG);
    TAG_TYPE = /* @__PURE__ */ Symbol("nbtify.tag.type");
  }
});

// node_modules/nbtify/dist/compression.js
async function compress(data, format) {
  const compressionStream = new CompressionStream(format);
  return pipeThroughCompressionStream(data, compressionStream);
}
async function decompress(data, format) {
  const decompressionStream = new DecompressionStream(format);
  return pipeThroughCompressionStream(data, decompressionStream);
}
async function pipeThroughCompressionStream(data, { readable, writable }) {
  const writer = writable.getWriter();
  writer.write(data).catch(() => {
  });
  writer.close().catch(() => {
  });
  const chunks = [];
  let byteLength = 0;
  const generator = Symbol.asyncIterator in readable ? readable : readableStreamToAsyncGenerator(readable);
  for await (const chunk of generator) {
    chunks.push(chunk);
    byteLength += chunk.byteLength;
  }
  const result = new Uint8Array(byteLength);
  let byteOffset = 0;
  for (const chunk of chunks) {
    result.set(chunk, byteOffset);
    byteOffset += chunk.byteLength;
  }
  return result;
}
async function* readableStreamToAsyncGenerator(readable) {
  const reader = readable.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
var init_compression = __esm({
  "node_modules/nbtify/dist/compression.js"() {
  }
});

// node_modules/nbtify/dist/error.js
var NBTError;
var init_error = __esm({
  "node_modules/nbtify/dist/error.js"() {
    NBTError = class extends Error {
      constructor(message, options) {
        super(message, options);
        __publicField(this, "byteOffset");
        __publicField(this, "cause");
        __publicField(this, "remaining");
        this.byteOffset = options.byteOffset;
        this.cause = options.cause;
        this.remaining = options.remaining;
      }
    };
  }
});

// node_modules/nbtify/dist/read.js
async function read(data, options = {}) {
  if (data instanceof Blob) {
    data = await data.arrayBuffer();
  }
  if (!("byteOffset" in data)) {
    data = new Uint8Array(data);
  }
  if (!(data instanceof Uint8Array)) {
    data;
    throw new TypeError("First parameter must be a Uint8Array, ArrayBuffer, SharedArrayBuffer, or Blob");
  }
  let { rootName, endian, compression, bedrockLevel, strict } = options;
  if (rootName !== void 0 && typeof rootName !== "boolean" && typeof rootName !== "string" && rootName !== null) {
    rootName;
    throw new TypeError("Root Name option must be a boolean, string, or null");
  }
  if (endian !== void 0 && endian !== "big" && endian !== "little") {
    endian;
    throw new TypeError("Endian option must be a valid endian type");
  }
  if (compression !== void 0 && compression !== "deflate" && compression !== "deflate-raw" && compression !== "gzip" && compression !== null) {
    compression;
    throw new TypeError("Compression option must be a valid compression type");
  }
  if (bedrockLevel !== void 0 && typeof bedrockLevel !== "boolean" && typeof bedrockLevel !== "number" && bedrockLevel !== null) {
    bedrockLevel;
    throw new TypeError("Bedrock Level option must be a boolean, number, or null");
  }
  if (strict !== void 0 && typeof strict !== "boolean") {
    strict;
    throw new TypeError("Strict option must be a boolean");
  }
  compression: if (compression === void 0) {
    switch (true) {
      case hasGzipHeader(data):
        compression = "gzip";
        break compression;
      case hasZlibHeader(data):
        compression = "deflate";
        break compression;
    }
    try {
      return await read(data, { ...options, compression: null });
    } catch (error) {
      try {
        return await read(data, { ...options, compression: "deflate-raw" });
      } catch {
        throw error;
      }
    }
  }
  compression;
  if (endian === void 0) {
    try {
      return await read(data, { ...options, endian: "big" });
    } catch (error) {
      try {
        return await read(data, { ...options, endian: "little" });
      } catch {
        throw error;
      }
    }
  }
  endian;
  if (rootName === void 0) {
    try {
      return await read(data, { ...options, rootName: true });
    } catch (error) {
      try {
        return await read(data, { ...options, rootName: false });
      } catch {
        throw error;
      }
    }
  }
  rootName;
  if (compression !== null) {
    data = await decompress(data, compression);
  }
  if (bedrockLevel === void 0) {
    bedrockLevel = hasBedrockLevelHeader(data, endian);
  }
  bedrockLevel;
  let bedrockLevelValue;
  if (bedrockLevel) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const version = view.getUint32(0, true);
    bedrockLevelValue = version;
    data = data.subarray(8);
  } else {
    bedrockLevelValue = null;
  }
  const result = new NBTReader().read(data, { rootName, endian, bedrockLevelValue, strict });
  return new NBTData(result, { compression, bedrockLevel });
}
function hasGzipHeader(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const header = view.getUint16(0, false);
  return header === 8075;
}
function hasZlibHeader(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const header = view.getUint8(0);
  return header === 120;
}
function hasBedrockLevelHeader(data, endian) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const byteLength = view.getUint32(4, true);
  return byteLength === data.byteLength - 8 && endian === "little";
}
var _rootName, _value, _byteOffset, _littleEndian, _data, _view, _decoder, _NBTReader_instances, checkIsValidBedrockLevel_fn, allocate_fn, readRoot_fn, readRootName_fn, readTag_fn, readTagType_fn, readUnsignedByte_fn, readByte_fn, readUnsignedShort_fn, readShort_fn, readInt_fn, readLong_fn, readFloat_fn, readDouble_fn, readByteArray_fn, readString_fn, readList_fn, readCompound_fn, readIntArray_fn, readLongArray_fn, NBTReader;
var init_read = __esm({
  "node_modules/nbtify/dist/read.js"() {
    init_format();
    init_primitive();
    init_tag();
    init_compression();
    init_error();
    NBTReader = class {
      constructor() {
        __privateAdd(this, _NBTReader_instances);
        __privateAdd(this, _rootName);
        __privateAdd(this, _value);
        __privateAdd(this, _byteOffset);
        __privateAdd(this, _littleEndian);
        __privateAdd(this, _data);
        __privateAdd(this, _view);
        __privateAdd(this, _decoder, new TextDecoder());
      }
      /**
       * Initiates the reader over an NBT buffer.
      */
      read(data, options = {}) {
        if (!(data instanceof Uint8Array)) {
          data;
          throw new TypeError("First parameter must be a Uint8Array");
        }
        let { rootName = true, endian = "big", bedrockLevelValue = null, strict = true } = options;
        if (typeof rootName !== "boolean" && typeof rootName !== "string" && rootName !== null) {
          rootName;
          throw new TypeError("Root Name option must be a boolean, string, or null");
        }
        if (endian !== "big" && endian !== "little") {
          endian;
          throw new TypeError("Endian option must be a valid endian type");
        }
        if (typeof bedrockLevelValue !== "number" && bedrockLevelValue !== null) {
          bedrockLevelValue;
          throw new TypeError("Bedrock Level must be a number or null");
        }
        if (typeof strict !== "boolean") {
          strict;
          throw new TypeError("Strict option must be a boolean");
        }
        __privateSet(this, _rootName, rootName);
        __privateSet(this, _byteOffset, 0);
        __privateSet(this, _littleEndian, endian === "little");
        __privateSet(this, _data, data);
        __privateSet(this, _view, new DataView(data.buffer, data.byteOffset, data.byteLength));
        __privateMethod(this, _NBTReader_instances, readRoot_fn).call(this);
        __privateMethod(this, _NBTReader_instances, checkIsValidBedrockLevel_fn).call(this, bedrockLevelValue);
        rootName = __privateGet(this, _rootName);
        const value = __privateGet(this, _value);
        if (strict && data.byteLength > __privateGet(this, _byteOffset)) {
          const remaining = data.byteLength - __privateGet(this, _byteOffset);
          throw new NBTError(`Encountered unexpected End tag at byte offset ${__privateGet(this, _byteOffset)}, ${remaining} unread bytes remaining`, { byteOffset: __privateGet(this, _byteOffset), cause: new NBTData(value, { rootName, endian }), remaining });
        }
        return new NBTData(value, { rootName, endian });
      }
    };
    _rootName = new WeakMap();
    _value = new WeakMap();
    _byteOffset = new WeakMap();
    _littleEndian = new WeakMap();
    _data = new WeakMap();
    _view = new WeakMap();
    _decoder = new WeakMap();
    _NBTReader_instances = new WeakSet();
    checkIsValidBedrockLevel_fn = function(bedrockLevelValue) {
      if (bedrockLevelValue === null)
        return;
      if (!("StorageVersion" in __privateGet(this, _value)) || !(__privateGet(this, _value)["StorageVersion"] instanceof Int32)) {
        throw new TypeError("Expected a 'StorageVersion' Int tag when Bedrock Level flag is enabled");
      }
      const storageVersion = __privateGet(this, _value)["StorageVersion"].valueOf();
      if (bedrockLevelValue !== storageVersion) {
        throw new Error("Bedrock Level header does not match the 'StorageVersion' value");
      }
    };
    allocate_fn = function(byteLength) {
      if (__privateGet(this, _byteOffset) + byteLength > __privateGet(this, _data).byteLength) {
        throw new Error("Ran out of bytes to read, unexpectedly reached the end of the buffer");
      }
    };
    readRoot_fn = function() {
      const type = __privateMethod(this, _NBTReader_instances, readTagType_fn).call(this);
      if (type !== TAG.LIST && type !== TAG.COMPOUND) {
        throw new Error(`Expected an opening List or Compound tag at the start of the buffer, encountered tag type '${type}'`);
      }
      __privateMethod(this, _NBTReader_instances, readRootName_fn).call(this);
      switch (type) {
        case TAG.LIST:
          __privateSet(this, _value, __privateMethod(this, _NBTReader_instances, readList_fn).call(this));
          break;
        case TAG.COMPOUND:
          __privateSet(this, _value, __privateMethod(this, _NBTReader_instances, readCompound_fn).call(this));
          break;
      }
    };
    readRootName_fn = function() {
      __privateSet(this, _rootName, typeof __privateGet(this, _rootName) === "string" || __privateGet(this, _rootName) ? __privateMethod(this, _NBTReader_instances, readString_fn).call(this) : null);
    };
    readTag_fn = function(type) {
      switch (type) {
        case TAG.END: {
          const remaining = __privateGet(this, _data).byteLength - __privateGet(this, _byteOffset);
          throw new Error(`Encountered unexpected End tag at byte offset ${__privateGet(this, _byteOffset)}, ${remaining} unread bytes remaining`);
        }
        case TAG.BYTE:
          return __privateMethod(this, _NBTReader_instances, readByte_fn).call(this);
        case TAG.SHORT:
          return __privateMethod(this, _NBTReader_instances, readShort_fn).call(this);
        case TAG.INT:
          return __privateMethod(this, _NBTReader_instances, readInt_fn).call(this);
        case TAG.LONG:
          return __privateMethod(this, _NBTReader_instances, readLong_fn).call(this);
        case TAG.FLOAT:
          return __privateMethod(this, _NBTReader_instances, readFloat_fn).call(this);
        case TAG.DOUBLE:
          return __privateMethod(this, _NBTReader_instances, readDouble_fn).call(this);
        case TAG.BYTE_ARRAY:
          return __privateMethod(this, _NBTReader_instances, readByteArray_fn).call(this);
        case TAG.STRING:
          return __privateMethod(this, _NBTReader_instances, readString_fn).call(this);
        case TAG.LIST:
          return __privateMethod(this, _NBTReader_instances, readList_fn).call(this);
        case TAG.COMPOUND:
          return __privateMethod(this, _NBTReader_instances, readCompound_fn).call(this);
        case TAG.INT_ARRAY:
          return __privateMethod(this, _NBTReader_instances, readIntArray_fn).call(this);
        case TAG.LONG_ARRAY:
          return __privateMethod(this, _NBTReader_instances, readLongArray_fn).call(this);
        default:
          throw new Error(`Encountered unsupported tag type '${type}' at byte offset ${__privateGet(this, _byteOffset)}`);
      }
    };
    readTagType_fn = function() {
      return __privateMethod(this, _NBTReader_instances, readUnsignedByte_fn).call(this);
    };
    readUnsignedByte_fn = function() {
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, 1);
      const value = __privateGet(this, _view).getUint8(__privateGet(this, _byteOffset));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + 1);
      return value;
    };
    readByte_fn = function(valueOf = false) {
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, 1);
      const value = __privateGet(this, _view).getInt8(__privateGet(this, _byteOffset));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + 1);
      return valueOf ? value : new Int8(value);
    };
    readUnsignedShort_fn = function() {
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, 2);
      const value = __privateGet(this, _view).getUint16(__privateGet(this, _byteOffset), __privateGet(this, _littleEndian));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + 2);
      return value;
    };
    readShort_fn = function(valueOf = false) {
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, 2);
      const value = __privateGet(this, _view).getInt16(__privateGet(this, _byteOffset), __privateGet(this, _littleEndian));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + 2);
      return valueOf ? value : new Int16(value);
    };
    readInt_fn = function(valueOf = false) {
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, 4);
      const value = __privateGet(this, _view).getInt32(__privateGet(this, _byteOffset), __privateGet(this, _littleEndian));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + 4);
      return valueOf ? value : new Int32(value);
    };
    readLong_fn = function() {
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, 8);
      const value = __privateGet(this, _view).getBigInt64(__privateGet(this, _byteOffset), __privateGet(this, _littleEndian));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + 8);
      return value;
    };
    readFloat_fn = function(valueOf = false) {
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, 4);
      const value = __privateGet(this, _view).getFloat32(__privateGet(this, _byteOffset), __privateGet(this, _littleEndian));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + 4);
      return valueOf ? value : new Float32(value);
    };
    readDouble_fn = function() {
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, 8);
      const value = __privateGet(this, _view).getFloat64(__privateGet(this, _byteOffset), __privateGet(this, _littleEndian));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + 8);
      return value;
    };
    readByteArray_fn = function() {
      const length = __privateMethod(this, _NBTReader_instances, readInt_fn).call(this, true);
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, length);
      const value = new Int8Array(__privateGet(this, _data).subarray(__privateGet(this, _byteOffset), __privateGet(this, _byteOffset) + length));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + length);
      return value;
    };
    readString_fn = function() {
      const length = __privateMethod(this, _NBTReader_instances, readUnsignedShort_fn).call(this);
      __privateMethod(this, _NBTReader_instances, allocate_fn).call(this, length);
      const value = __privateGet(this, _decoder).decode(__privateGet(this, _data).subarray(__privateGet(this, _byteOffset), __privateGet(this, _byteOffset) + length));
      __privateSet(this, _byteOffset, __privateGet(this, _byteOffset) + length);
      return value;
    };
    readList_fn = function() {
      const type = __privateMethod(this, _NBTReader_instances, readTagType_fn).call(this);
      const length = __privateMethod(this, _NBTReader_instances, readInt_fn).call(this, true);
      const value = [];
      Object.defineProperty(value, TAG_TYPE, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: type
      });
      for (let i = 0; i < length; i++) {
        const entry = __privateMethod(this, _NBTReader_instances, readTag_fn).call(this, type);
        value.push(entry);
      }
      return value;
    };
    readCompound_fn = function() {
      const value = {};
      while (true) {
        const type = __privateMethod(this, _NBTReader_instances, readTagType_fn).call(this);
        if (type === TAG.END)
          break;
        const name = __privateMethod(this, _NBTReader_instances, readString_fn).call(this);
        const entry = __privateMethod(this, _NBTReader_instances, readTag_fn).call(this, type);
        value[name] = entry;
      }
      return value;
    };
    readIntArray_fn = function() {
      const length = __privateMethod(this, _NBTReader_instances, readInt_fn).call(this, true);
      const value = new Int32Array(length);
      for (const i in value) {
        const entry = __privateMethod(this, _NBTReader_instances, readInt_fn).call(this, true);
        value[i] = entry;
      }
      return value;
    };
    readLongArray_fn = function() {
      const length = __privateMethod(this, _NBTReader_instances, readInt_fn).call(this, true);
      const value = new BigInt64Array(length);
      for (const i in value) {
        const entry = __privateMethod(this, _NBTReader_instances, readLong_fn).call(this);
        value[i] = entry;
      }
      return value;
    };
  }
});

// node_modules/nbtify/dist/write.js
async function write(data, options = {}) {
  if (data instanceof NBTData) {
    if (options.rootName === void 0) {
      options.rootName = data.rootName;
    }
    if (options.endian === void 0) {
      options.endian = data.endian;
    }
    if (options.compression === void 0) {
      options.compression = data.compression;
    }
    if (options.bedrockLevel === void 0) {
      options.bedrockLevel = data.bedrockLevel;
    }
    data = data.data;
  }
  const { rootName, endian, compression, bedrockLevel } = options;
  if (typeof data !== "object" || data === null) {
    data;
    throw new TypeError("First parameter must be an object or array");
  }
  if (rootName !== void 0 && typeof rootName !== "string" && rootName !== null) {
    rootName;
    throw new TypeError("Root Name option must be a string or null");
  }
  if (endian !== void 0 && endian !== "big" && endian !== "little") {
    endian;
    throw new TypeError("Endian option must be a valid endian type");
  }
  if (compression !== void 0 && compression !== "deflate" && compression !== "deflate-raw" && compression !== "gzip" && compression !== null) {
    compression;
    throw new TypeError("Compression option must be a valid compression type");
  }
  if (bedrockLevel !== void 0 && typeof bedrockLevel !== "boolean") {
    bedrockLevel;
    throw new TypeError("Bedrock Level option must be a boolean");
  }
  let result = new NBTWriter().write(data, { rootName, endian });
  if (bedrockLevel) {
    if (endian !== "little") {
      throw new TypeError("Endian option must be 'little' when the Bedrock Level flag is enabled");
    }
    if (!("StorageVersion" in data) || !(data.StorageVersion instanceof Int32)) {
      throw new TypeError("Expected a 'StorageVersion' Int tag when Bedrock Level flag is enabled");
    }
    const { byteLength } = result;
    const data1 = new Uint8Array(byteLength + 8);
    const view = new DataView(data1.buffer);
    const version = data.StorageVersion.valueOf();
    view.setUint32(0, version, true);
    view.setUint32(4, byteLength, true);
    data1.set(result, 8);
    result = data1;
  }
  if (compression !== void 0 && compression !== null) {
    result = await compress(result, compression);
  }
  return result;
}
var _rootName2, _byteOffset2, _littleEndian2, _data2, _view2, _encoder, _NBTWriter_instances, allocate_fn2, writeRoot_fn, writeRootName_fn, writeTag_fn, writeTagType_fn, writeUnsignedByte_fn, writeByte_fn, writeUnsignedShort_fn, writeShort_fn, writeInt_fn, writeLong_fn, writeFloat_fn, writeDouble_fn, writeByteArray_fn, writeString_fn, writeList_fn, writeCompound_fn, writeIntArray_fn, writeLongArray_fn, NBTWriter;
var init_write = __esm({
  "node_modules/nbtify/dist/write.js"() {
    init_format();
    init_tag();
    init_primitive();
    init_compression();
    NBTWriter = class {
      constructor() {
        __privateAdd(this, _NBTWriter_instances);
        __privateAdd(this, _rootName2);
        __privateAdd(this, _byteOffset2);
        __privateAdd(this, _littleEndian2);
        __privateAdd(this, _data2);
        __privateAdd(this, _view2);
        __privateAdd(this, _encoder, new TextEncoder());
      }
      /**
       * Initiates the writer over an NBTData object.
      */
      write(data, options = {}) {
        if (data instanceof NBTData) {
          if (options.rootName === void 0) {
            options.rootName = data.rootName;
          }
          if (options.endian === void 0) {
            options.endian = data.endian;
          }
          data = data.data;
        }
        const { rootName = "", endian = "big" } = options;
        if (typeof data !== "object" || data === null) {
          data;
          throw new TypeError("First parameter must be an object or array");
        }
        if (typeof rootName !== "string" && rootName !== null) {
          rootName;
          throw new TypeError("Root Name option must be a string or null");
        }
        if (endian !== "big" && endian !== "little") {
          endian;
          throw new TypeError("Endian option must be a valid endian type");
        }
        __privateSet(this, _rootName2, rootName);
        __privateSet(this, _byteOffset2, 0);
        __privateSet(this, _littleEndian2, endian === "little");
        __privateSet(this, _data2, new Uint8Array(1024));
        __privateSet(this, _view2, new DataView(__privateGet(this, _data2).buffer));
        __privateMethod(this, _NBTWriter_instances, writeRoot_fn).call(this, data);
        __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, 0);
        return __privateGet(this, _data2).slice(0, __privateGet(this, _byteOffset2));
      }
    };
    _rootName2 = new WeakMap();
    _byteOffset2 = new WeakMap();
    _littleEndian2 = new WeakMap();
    _data2 = new WeakMap();
    _view2 = new WeakMap();
    _encoder = new WeakMap();
    _NBTWriter_instances = new WeakSet();
    allocate_fn2 = function(byteLength) {
      const required = __privateGet(this, _byteOffset2) + byteLength;
      if (__privateGet(this, _data2).byteLength >= required)
        return;
      let length = __privateGet(this, _data2).byteLength;
      while (length < required) {
        length *= 2;
      }
      const data = new Uint8Array(length);
      data.set(__privateGet(this, _data2), 0);
      if (__privateGet(this, _byteOffset2) > __privateGet(this, _data2).byteLength) {
        data.fill(0, byteLength, __privateGet(this, _byteOffset2));
      }
      __privateSet(this, _data2, data);
      __privateSet(this, _view2, new DataView(data.buffer));
    };
    writeRoot_fn = function(value) {
      const type = getTagType(value);
      if (type !== TAG.LIST && type !== TAG.COMPOUND) {
        throw new TypeError("Encountered unexpected Root tag type, must be either a List or Compound tag");
      }
      __privateMethod(this, _NBTWriter_instances, writeTagType_fn).call(this, type);
      __privateMethod(this, _NBTWriter_instances, writeRootName_fn).call(this, __privateGet(this, _rootName2));
      switch (type) {
        case TAG.LIST:
          return __privateMethod(this, _NBTWriter_instances, writeList_fn).call(this, value);
        case TAG.COMPOUND:
          return __privateMethod(this, _NBTWriter_instances, writeCompound_fn).call(this, value);
      }
    };
    writeRootName_fn = function(value) {
      if (value === null)
        return;
      __privateMethod(this, _NBTWriter_instances, writeString_fn).call(this, value);
    };
    writeTag_fn = function(value) {
      const type = getTagType(value);
      switch (type) {
        case TAG.BYTE:
          return __privateMethod(this, _NBTWriter_instances, writeByte_fn).call(this, value);
        case TAG.SHORT:
          return __privateMethod(this, _NBTWriter_instances, writeShort_fn).call(this, value);
        case TAG.INT:
          return __privateMethod(this, _NBTWriter_instances, writeInt_fn).call(this, value);
        case TAG.LONG:
          return __privateMethod(this, _NBTWriter_instances, writeLong_fn).call(this, value);
        case TAG.FLOAT:
          return __privateMethod(this, _NBTWriter_instances, writeFloat_fn).call(this, value);
        case TAG.DOUBLE:
          return __privateMethod(this, _NBTWriter_instances, writeDouble_fn).call(this, value);
        case TAG.BYTE_ARRAY:
          return __privateMethod(this, _NBTWriter_instances, writeByteArray_fn).call(this, value);
        case TAG.STRING:
          return __privateMethod(this, _NBTWriter_instances, writeString_fn).call(this, value);
        case TAG.LIST:
          return __privateMethod(this, _NBTWriter_instances, writeList_fn).call(this, value);
        case TAG.COMPOUND:
          return __privateMethod(this, _NBTWriter_instances, writeCompound_fn).call(this, value);
        case TAG.INT_ARRAY:
          return __privateMethod(this, _NBTWriter_instances, writeIntArray_fn).call(this, value);
        case TAG.LONG_ARRAY:
          return __privateMethod(this, _NBTWriter_instances, writeLongArray_fn).call(this, value);
      }
    };
    writeTagType_fn = function(type) {
      __privateMethod(this, _NBTWriter_instances, writeUnsignedByte_fn).call(this, type);
    };
    writeUnsignedByte_fn = function(value) {
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, 1);
      __privateGet(this, _view2).setUint8(__privateGet(this, _byteOffset2), value);
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + 1);
    };
    writeByte_fn = function(value) {
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, 1);
      __privateGet(this, _view2).setInt8(__privateGet(this, _byteOffset2), Number(value.valueOf()));
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + 1);
    };
    writeUnsignedShort_fn = function(value) {
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, 2);
      __privateGet(this, _view2).setUint16(__privateGet(this, _byteOffset2), value, __privateGet(this, _littleEndian2));
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + 2);
    };
    writeShort_fn = function(value) {
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, 2);
      __privateGet(this, _view2).setInt16(__privateGet(this, _byteOffset2), value.valueOf(), __privateGet(this, _littleEndian2));
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + 2);
    };
    writeInt_fn = function(value) {
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, 4);
      __privateGet(this, _view2).setInt32(__privateGet(this, _byteOffset2), value.valueOf(), __privateGet(this, _littleEndian2));
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + 4);
    };
    writeLong_fn = function(value) {
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, 8);
      __privateGet(this, _view2).setBigInt64(__privateGet(this, _byteOffset2), value, __privateGet(this, _littleEndian2));
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + 8);
    };
    writeFloat_fn = function(value) {
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, 4);
      __privateGet(this, _view2).setFloat32(__privateGet(this, _byteOffset2), value.valueOf(), __privateGet(this, _littleEndian2));
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + 4);
    };
    writeDouble_fn = function(value) {
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, 8);
      __privateGet(this, _view2).setFloat64(__privateGet(this, _byteOffset2), value, __privateGet(this, _littleEndian2));
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + 8);
    };
    writeByteArray_fn = function(value) {
      const { length } = value;
      __privateMethod(this, _NBTWriter_instances, writeInt_fn).call(this, length);
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, length);
      __privateGet(this, _data2).set(value, __privateGet(this, _byteOffset2));
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + length);
    };
    writeString_fn = function(value) {
      const entry = __privateGet(this, _encoder).encode(value);
      const { length } = entry;
      __privateMethod(this, _NBTWriter_instances, writeUnsignedShort_fn).call(this, length);
      __privateMethod(this, _NBTWriter_instances, allocate_fn2).call(this, length);
      __privateGet(this, _data2).set(entry, __privateGet(this, _byteOffset2));
      __privateSet(this, _byteOffset2, __privateGet(this, _byteOffset2) + length);
    };
    writeList_fn = function(value) {
      let type = value[TAG_TYPE];
      value = value.filter(isTag);
      type = type ?? (value[0] !== void 0 ? getTagType(value[0]) : TAG.END);
      const { length } = value;
      __privateMethod(this, _NBTWriter_instances, writeTagType_fn).call(this, type);
      __privateMethod(this, _NBTWriter_instances, writeInt_fn).call(this, length);
      for (const entry of value) {
        if (getTagType(entry) !== type) {
          throw new TypeError("Encountered unexpected item type in array, all tags in a List tag must be of the same type");
        }
        __privateMethod(this, _NBTWriter_instances, writeTag_fn).call(this, entry);
      }
    };
    writeCompound_fn = function(value) {
      for (const [name, entry] of Object.entries(value)) {
        if (entry === void 0)
          continue;
        const type = getTagType(entry);
        if (type === null)
          continue;
        __privateMethod(this, _NBTWriter_instances, writeTagType_fn).call(this, type);
        __privateMethod(this, _NBTWriter_instances, writeString_fn).call(this, name);
        __privateMethod(this, _NBTWriter_instances, writeTag_fn).call(this, entry);
      }
      __privateMethod(this, _NBTWriter_instances, writeTagType_fn).call(this, TAG.END);
    };
    writeIntArray_fn = function(value) {
      const { length } = value;
      __privateMethod(this, _NBTWriter_instances, writeInt_fn).call(this, length);
      for (const entry of value) {
        __privateMethod(this, _NBTWriter_instances, writeInt_fn).call(this, entry);
      }
    };
    writeLongArray_fn = function(value) {
      const { length } = value;
      __privateMethod(this, _NBTWriter_instances, writeInt_fn).call(this, length);
      for (const entry of value) {
        __privateMethod(this, _NBTWriter_instances, writeLong_fn).call(this, entry);
      }
    };
  }
});

// node_modules/nbtify/dist/parse.js
function parse(data) {
  if (typeof data !== "string") {
    data;
    throw new TypeError("First parameter must be a string");
  }
  return new SNBTReader().read(data);
}
var UNQUOTED_STRING_PATTERN, _data3, _index, _i, _char, _SNBTReader_instances, peek_fn, unexpectedEnd_fn, unexpectedChar_fn, skipWhitespace_fn, readRoot_fn2, readTag_fn2, readNumber_fn, readString_fn2, readUnquotedString_fn, readQuotedString_fn, unescapeString_fn, skipCommas_fn, readArray_fn, readList_fn2, readCompound_fn2, SNBTReader;
var init_parse = __esm({
  "node_modules/nbtify/dist/parse.js"() {
    init_primitive();
    init_tag();
    UNQUOTED_STRING_PATTERN = /^[0-9A-Za-z.+_-]+$/;
    SNBTReader = class {
      constructor() {
        __privateAdd(this, _SNBTReader_instances);
        __privateAdd(this, _data3);
        __privateAdd(this, _index);
        __privateAdd(this, _i);
        __privateAdd(this, _char);
      }
      /**
       * Initiates the reader over an SNBT string.
      */
      read(data) {
        if (typeof data !== "string") {
          data;
          throw new TypeError("First parameter must be a string");
        }
        __privateSet(this, _data3, data);
        __privateSet(this, _index, 0);
        __privateSet(this, _i, 0);
        __privateSet(this, _char, "");
        return __privateMethod(this, _SNBTReader_instances, readRoot_fn2).call(this);
      }
    };
    _data3 = new WeakMap();
    _index = new WeakMap();
    _i = new WeakMap();
    _char = new WeakMap();
    _SNBTReader_instances = new WeakSet();
    peek_fn = function(byteOffset = __privateGet(this, _index)) {
      const value = __privateGet(this, _data3)[byteOffset];
      if (value === void 0) {
        throw __privateMethod(this, _SNBTReader_instances, unexpectedEnd_fn).call(this);
      }
      return value;
    };
    unexpectedEnd_fn = function() {
      return new Error("Unexpected end");
    };
    unexpectedChar_fn = function(i) {
      if (i == null) {
        i = __privateGet(this, _index);
      }
      return new Error(`Unexpected character ${__privateMethod(this, _SNBTReader_instances, peek_fn).call(this)} at position ${__privateGet(this, _index)}`);
    };
    skipWhitespace_fn = function() {
      while (__privateGet(this, _index) < __privateGet(this, _data3).length) {
        if (!/ |\t|\r/.test(__privateMethod(this, _SNBTReader_instances, peek_fn).call(this)) && __privateMethod(this, _SNBTReader_instances, peek_fn).call(this) != "\n")
          return;
        __privateSet(this, _index, __privateGet(this, _index) + 1);
      }
    };
    readRoot_fn2 = function() {
      __privateMethod(this, _SNBTReader_instances, skipWhitespace_fn).call(this);
      __privateSet(this, _i, __privateGet(this, _index));
      __privateSet(this, _char, __privateMethod(this, _SNBTReader_instances, peek_fn).call(this));
      switch (__privateGet(this, _char)) {
        case "{": {
          __privateWrapper(this, _index)._++;
          return __privateMethod(this, _SNBTReader_instances, readCompound_fn2).call(this);
        }
        case "[": {
          __privateWrapper(this, _index)._++;
          const list = __privateMethod(this, _SNBTReader_instances, readList_fn2).call(this, "[root]");
          const type = getTagType(list);
          if (type !== TAG.LIST)
            break;
          return list;
        }
      }
      throw new Error("Encountered unexpected Root tag type, must be either a List or Compound tag");
    };
    readTag_fn2 = function(key) {
      __privateMethod(this, _SNBTReader_instances, skipWhitespace_fn).call(this);
      __privateSet(this, _i, __privateGet(this, _index));
      __privateSet(this, _char, __privateMethod(this, _SNBTReader_instances, peek_fn).call(this));
      switch (__privateGet(this, _char)) {
        case "{": {
          __privateWrapper(this, _index)._++;
          return __privateMethod(this, _SNBTReader_instances, readCompound_fn2).call(this);
        }
        case "[":
          return __privateWrapper(this, _index)._++, __privateMethod(this, _SNBTReader_instances, readList_fn2).call(this, key);
        case '"':
        case "'":
          return __privateMethod(this, _SNBTReader_instances, readQuotedString_fn).call(this);
        default: {
          if (/^(true)$/.test(__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index) + 4)) || /^(false)$/.test(__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index) + 5))) {
            return __privateMethod(this, _SNBTReader_instances, readUnquotedString_fn).call(this) === "true";
          }
          const value = __privateMethod(this, _SNBTReader_instances, readNumber_fn).call(this);
          if (value != null && (__privateGet(this, _index) == __privateGet(this, _data3).length || !UNQUOTED_STRING_PATTERN.test(__privateMethod(this, _SNBTReader_instances, peek_fn).call(this)))) {
            return value;
          }
          return __privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index)) + __privateMethod(this, _SNBTReader_instances, readUnquotedString_fn).call(this);
        }
      }
    };
    readNumber_fn = function() {
      if (!"-0123456789".includes(__privateMethod(this, _SNBTReader_instances, peek_fn).call(this)))
        return null;
      __privateSet(this, _i, __privateWrapper(this, _index)._++);
      let hasFloatingPoint = false;
      while (__privateGet(this, _index) < __privateGet(this, _data3).length) {
        __privateSet(this, _char, __privateMethod(this, _SNBTReader_instances, peek_fn).call(this, __privateWrapper(this, _index)._++));
        if ("0123456789e-+".includes(__privateGet(this, _char)))
          continue;
        switch (__privateGet(this, _char).toLowerCase()) {
          case ".": {
            if (hasFloatingPoint) {
              __privateWrapper(this, _index)._--;
              return null;
            }
            hasFloatingPoint = true;
            break;
          }
          case "f":
            return new Float32(+__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index) - 1));
          case "d":
            return +__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index) - 1);
          case "b":
            return new Int8(+__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index) - 1));
          case "s":
            return new Int16(+__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index) - 1));
          case "l":
            return BigInt(__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index) - 1));
          default: {
            if (hasFloatingPoint) {
              return +__privateGet(this, _data3).slice(__privateGet(this, _i), --__privateWrapper(this, _index)._);
            } else {
              return new Int32(+__privateGet(this, _data3).slice(__privateGet(this, _i), --__privateWrapper(this, _index)._));
            }
          }
        }
      }
      if (hasFloatingPoint) {
        return +__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index));
      } else {
        return new Int32(+__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index)));
      }
    };
    readString_fn2 = function() {
      if (__privateMethod(this, _SNBTReader_instances, peek_fn).call(this) == '"' || __privateMethod(this, _SNBTReader_instances, peek_fn).call(this) == "'") {
        return __privateMethod(this, _SNBTReader_instances, readQuotedString_fn).call(this);
      } else {
        return __privateMethod(this, _SNBTReader_instances, readUnquotedString_fn).call(this);
      }
    };
    readUnquotedString_fn = function() {
      __privateSet(this, _i, __privateGet(this, _index));
      while (__privateGet(this, _index) < __privateGet(this, _data3).length) {
        if (!UNQUOTED_STRING_PATTERN.test(__privateMethod(this, _SNBTReader_instances, peek_fn).call(this)))
          break;
        __privateWrapper(this, _index)._++;
      }
      if (__privateGet(this, _index) - __privateGet(this, _i) == 0) {
        if (__privateGet(this, _index) == __privateGet(this, _data3).length) {
          throw __privateMethod(this, _SNBTReader_instances, unexpectedEnd_fn).call(this);
        } else {
          throw __privateMethod(this, _SNBTReader_instances, unexpectedChar_fn).call(this);
        }
      }
      return __privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index));
    };
    readQuotedString_fn = function() {
      const quoteChar = __privateMethod(this, _SNBTReader_instances, peek_fn).call(this);
      __privateSet(this, _i, ++__privateWrapper(this, _index)._);
      let string = "";
      while (__privateGet(this, _index) < __privateGet(this, _data3).length) {
        __privateSet(this, _char, __privateMethod(this, _SNBTReader_instances, peek_fn).call(this, __privateWrapper(this, _index)._++));
        if (__privateGet(this, _char) === "\\") {
          __privateSet(this, _char, `\\${__privateMethod(this, _SNBTReader_instances, peek_fn).call(this, __privateWrapper(this, _index)._++)}`);
        }
        if (__privateGet(this, _char) === quoteChar) {
          return string;
        }
        string += __privateMethod(this, _SNBTReader_instances, unescapeString_fn).call(this, __privateGet(this, _char));
      }
      throw __privateMethod(this, _SNBTReader_instances, unexpectedEnd_fn).call(this);
    };
    unescapeString_fn = function(value) {
      return value.replaceAll("\\\\", "\\").replaceAll('\\"', '"').replaceAll("\\'", "'").replaceAll("\\b", "\b").replaceAll("\\f", "\f").replaceAll("\\n", "\n").replaceAll("\\r", "\r").replaceAll("\\t", "	");
    };
    skipCommas_fn = function(isFirst, end) {
      __privateMethod(this, _SNBTReader_instances, skipWhitespace_fn).call(this);
      if (__privateMethod(this, _SNBTReader_instances, peek_fn).call(this) == ",") {
        if (isFirst) {
          throw __privateMethod(this, _SNBTReader_instances, unexpectedChar_fn).call(this);
        } else {
          __privateWrapper(this, _index)._++;
          __privateMethod(this, _SNBTReader_instances, skipWhitespace_fn).call(this);
        }
      } else if (!isFirst && __privateMethod(this, _SNBTReader_instances, peek_fn).call(this) != end) {
        throw __privateMethod(this, _SNBTReader_instances, unexpectedChar_fn).call(this);
      }
    };
    readArray_fn = function(type) {
      const array = [];
      while (__privateGet(this, _index) < __privateGet(this, _data3).length) {
        __privateMethod(this, _SNBTReader_instances, skipCommas_fn).call(this, array.length == 0, "]");
        if (__privateMethod(this, _SNBTReader_instances, peek_fn).call(this) == "]") {
          __privateWrapper(this, _index)._++;
          switch (type) {
            case "B":
              return Int8Array.from(array.map((v) => +v));
            case "I":
              return Int32Array.from(array.map((v) => +v));
            case "L":
              return BigInt64Array.from(array.map((v) => BigInt(v)));
          }
        }
        __privateSet(this, _i, __privateGet(this, _index));
        if (__privateMethod(this, _SNBTReader_instances, peek_fn).call(this) == "-") {
          __privateWrapper(this, _index)._++;
        }
        while (__privateGet(this, _index) < __privateGet(this, _data3).length) {
          if (!"0123456789".includes(__privateMethod(this, _SNBTReader_instances, peek_fn).call(this)))
            break;
          __privateWrapper(this, _index)._++;
        }
        const prefix = type === "B" ? "b" : type === "L" ? "l" : "";
        if (__privateMethod(this, _SNBTReader_instances, peek_fn).call(this) == prefix) {
          __privateWrapper(this, _index)._++;
        }
        if (__privateGet(this, _index) - __privateGet(this, _i) == 0) {
          throw __privateMethod(this, _SNBTReader_instances, unexpectedChar_fn).call(this);
        }
        if (UNQUOTED_STRING_PATTERN.test(__privateMethod(this, _SNBTReader_instances, peek_fn).call(this))) {
          throw __privateMethod(this, _SNBTReader_instances, unexpectedChar_fn).call(this);
        }
        array.push(__privateGet(this, _data3).slice(__privateGet(this, _i), __privateGet(this, _index) - (type !== "I" ? 1 : 0)));
      }
      throw __privateMethod(this, _SNBTReader_instances, unexpectedEnd_fn).call(this);
    };
    readList_fn2 = function(key) {
      if ("BILbil".includes(__privateMethod(this, _SNBTReader_instances, peek_fn).call(this)) && __privateGet(this, _data3)[__privateGet(this, _index) + 1] == ";") {
        return __privateMethod(this, _SNBTReader_instances, readArray_fn).call(this, __privateMethod(this, _SNBTReader_instances, peek_fn).call(this, __privateSet(this, _index, __privateGet(this, _index) + 2) - 2).toUpperCase());
      }
      const array = [];
      let type;
      while (__privateGet(this, _index) < __privateGet(this, _data3).length) {
        __privateMethod(this, _SNBTReader_instances, skipWhitespace_fn).call(this);
        if (__privateMethod(this, _SNBTReader_instances, peek_fn).call(this) == ",") {
          if (array.length == 0) {
            throw __privateMethod(this, _SNBTReader_instances, unexpectedChar_fn).call(this);
          } else {
            __privateWrapper(this, _index)._++;
            __privateMethod(this, _SNBTReader_instances, skipWhitespace_fn).call(this);
          }
        } else if (array.length > 0 && __privateMethod(this, _SNBTReader_instances, peek_fn).call(this) != "]") {
          throw __privateMethod(this, _SNBTReader_instances, unexpectedChar_fn).call(this, __privateGet(this, _index) - 1);
        }
        if (__privateMethod(this, _SNBTReader_instances, peek_fn).call(this) == "]") {
          __privateWrapper(this, _index)._++;
          return array;
        }
        const entry = __privateMethod(this, _SNBTReader_instances, readTag_fn2).call(this, key);
        if (type === void 0) {
          type = getTagType(entry);
        }
        if (getTagType(entry) !== type) {
          throw new TypeError(`Encountered unexpected item type '${getTagType(entry)}' in List '${key}' at index ${array.length}, expected item type '${type}'. All tags in a List tag must be of the same type`);
        }
        array.push(entry);
      }
      throw __privateMethod(this, _SNBTReader_instances, unexpectedEnd_fn).call(this);
    };
    readCompound_fn2 = function() {
      const entries = [];
      let first = true;
      while (true) {
        __privateMethod(this, _SNBTReader_instances, skipCommas_fn).call(this, first, "}");
        first = false;
        if (__privateMethod(this, _SNBTReader_instances, peek_fn).call(this) == "}") {
          __privateWrapper(this, _index)._++;
          return entries.reduce((obj, [k, v]) => (obj[k] = v, obj), {});
        }
        const key = __privateMethod(this, _SNBTReader_instances, readString_fn2).call(this);
        __privateMethod(this, _SNBTReader_instances, skipWhitespace_fn).call(this);
        if (__privateGet(this, _data3)[__privateWrapper(this, _index)._++] != ":") {
          throw __privateMethod(this, _SNBTReader_instances, unexpectedChar_fn).call(this);
        }
        entries.push([key, __privateMethod(this, _SNBTReader_instances, readTag_fn2).call(this, key)]);
      }
    };
  }
});

// node_modules/nbtify/dist/stringify.js
function stringify(data, { space = "" } = {}) {
  if (data instanceof NBTData) {
    data = data.data;
  }
  if (typeof data !== "object" || data === null) {
    data;
    throw new TypeError("First parameter must be an object or array");
  }
  if (typeof space !== "string" && typeof space !== "number") {
    space;
    throw new TypeError("Space option must be a string or number");
  }
  return new SNBTWriter().write(data, { space });
}
var _space, _level, _SNBTWriter_instances, writeRoot_fn2, writeTag_fn2, writeByte_fn2, writeShort_fn2, writeInt_fn2, writeLong_fn2, writeFloat_fn2, writeDouble_fn2, writeByteArray_fn2, writeString_fn2, escapeString_fn, writeList_fn2, writeCompound_fn2, writeIntArray_fn2, writeLongArray_fn2, SNBTWriter;
var init_stringify = __esm({
  "node_modules/nbtify/dist/stringify.js"() {
    init_format();
    init_tag();
    init_primitive();
    SNBTWriter = class {
      constructor() {
        __privateAdd(this, _SNBTWriter_instances);
        __privateAdd(this, _space);
        __privateAdd(this, _level);
      }
      write(data, { space = "" } = {}) {
        if (data instanceof NBTData) {
          data = data.data;
        }
        if (typeof data !== "object" || data === null) {
          data;
          throw new TypeError("First parameter must be an object or array");
        }
        if (typeof space !== "string" && typeof space !== "number") {
          space;
          throw new TypeError("Space option must be a string or number");
        }
        __privateSet(this, _space, typeof space === "number" ? " ".repeat(space) : space);
        __privateSet(this, _level, 1);
        return __privateMethod(this, _SNBTWriter_instances, writeRoot_fn2).call(this, data);
      }
    };
    _space = new WeakMap();
    _level = new WeakMap();
    _SNBTWriter_instances = new WeakSet();
    writeRoot_fn2 = function(value) {
      const type = getTagType(value);
      if (type !== TAG.LIST && type !== TAG.COMPOUND) {
        throw new TypeError("Encountered unexpected Root tag type, must be either a List or Compound tag");
      }
      switch (type) {
        case TAG.LIST:
          return __privateMethod(this, _SNBTWriter_instances, writeList_fn2).call(this, value);
        case TAG.COMPOUND:
          return __privateMethod(this, _SNBTWriter_instances, writeCompound_fn2).call(this, value);
      }
    };
    writeTag_fn2 = function(value) {
      const type = getTagType(value);
      switch (type) {
        case TAG.BYTE:
          return __privateMethod(this, _SNBTWriter_instances, writeByte_fn2).call(this, value);
        case TAG.SHORT:
          return __privateMethod(this, _SNBTWriter_instances, writeShort_fn2).call(this, value);
        case TAG.INT:
          return __privateMethod(this, _SNBTWriter_instances, writeInt_fn2).call(this, value);
        case TAG.LONG:
          return __privateMethod(this, _SNBTWriter_instances, writeLong_fn2).call(this, value);
        case TAG.FLOAT:
          return __privateMethod(this, _SNBTWriter_instances, writeFloat_fn2).call(this, value);
        case TAG.DOUBLE:
          return __privateMethod(this, _SNBTWriter_instances, writeDouble_fn2).call(this, value);
        case TAG.BYTE_ARRAY:
          return __privateMethod(this, _SNBTWriter_instances, writeByteArray_fn2).call(this, value);
        case TAG.STRING:
          return __privateMethod(this, _SNBTWriter_instances, writeString_fn2).call(this, value);
        case TAG.LIST:
          return __privateMethod(this, _SNBTWriter_instances, writeList_fn2).call(this, value);
        case TAG.COMPOUND:
          return __privateMethod(this, _SNBTWriter_instances, writeCompound_fn2).call(this, value);
        case TAG.INT_ARRAY:
          return __privateMethod(this, _SNBTWriter_instances, writeIntArray_fn2).call(this, value);
        case TAG.LONG_ARRAY:
          return __privateMethod(this, _SNBTWriter_instances, writeLongArray_fn2).call(this, value);
        default:
          throw new Error(`Encountered unsupported tag type '${type}'`);
      }
    };
    writeByte_fn2 = function(value) {
      return typeof value === "boolean" ? `${value}` : `${value.valueOf()}b`;
    };
    writeShort_fn2 = function(value) {
      return `${value.valueOf()}s`;
    };
    writeInt_fn2 = function(value) {
      return `${value.valueOf()}`;
    };
    writeLong_fn2 = function(value) {
      return `${value}l`;
    };
    writeFloat_fn2 = function(value) {
      return `${value.valueOf()}${Number.isInteger(value.valueOf()) ? ".0" : ""}f`;
    };
    writeDouble_fn2 = function(value) {
      return `${value}${!Number.isInteger(value) || value.toExponential() === value.toString() ? "" : ".0"}d`;
    };
    writeByteArray_fn2 = function(value) {
      return `[B;${[...value].map((entry) => __privateMethod(this, _SNBTWriter_instances, writeByte_fn2).call(this, new Int8(entry))).join()}]`;
    };
    writeString_fn2 = function(value) {
      const singleQuoteString = __privateMethod(this, _SNBTWriter_instances, escapeString_fn).call(this, value.replace(/['\\]/g, (character) => `\\${character}`));
      const doubleQuoteString = __privateMethod(this, _SNBTWriter_instances, escapeString_fn).call(this, value.replace(/["\\]/g, (character) => `\\${character}`));
      return singleQuoteString.length < doubleQuoteString.length ? `'${singleQuoteString}'` : `"${doubleQuoteString}"`;
    };
    escapeString_fn = function(value) {
      return value.replaceAll("\b", "\\b").replaceAll("\f", "\\f").replaceAll("\n", "\\n").replaceAll("\r", "\\r").replaceAll("	", "\\t");
    };
    writeList_fn2 = function(value) {
      value = value.filter(isTag);
      const fancy = __privateGet(this, _space) !== "";
      const type = value[0] !== void 0 ? getTagType(value[0]) : TAG.END;
      const isIndentedList = fancy && (/* @__PURE__ */ new Set([TAG.BYTE_ARRAY, TAG.LIST, TAG.COMPOUND, TAG.INT_ARRAY, TAG.LONG_ARRAY])).has(type);
      return `[${value.map((entry) => `${isIndentedList ? `
${__privateGet(this, _space).repeat(__privateGet(this, _level))}` : ""}${(() => {
        __privateSet(this, _level, __privateGet(this, _level) + 1);
        if (getTagType(entry) !== type) {
          throw new TypeError("Encountered unexpected item type in array, all tags in a List tag must be of the same type");
        }
        const result = __privateMethod(this, _SNBTWriter_instances, writeTag_fn2).call(this, entry);
        __privateSet(this, _level, __privateGet(this, _level) - 1);
        return result;
      })()}`).join(`,${fancy && !isIndentedList ? " " : ""}`)}${isIndentedList ? `
${__privateGet(this, _space).repeat(__privateGet(this, _level) - 1)}` : ""}]`;
    };
    writeCompound_fn2 = function(value) {
      const fancy = __privateGet(this, _space) !== "";
      return `{${Object.entries(value).filter((entry) => isTag(entry[1])).map(([key, value2]) => `${fancy ? `
${__privateGet(this, _space).repeat(__privateGet(this, _level))}` : ""}${/^[0-9a-z_\-.+]+$/i.test(key) ? key : __privateMethod(this, _SNBTWriter_instances, writeString_fn2).call(this, key)}:${fancy ? " " : ""}${(() => {
        __privateSet(this, _level, __privateGet(this, _level) + 1);
        const result = __privateMethod(this, _SNBTWriter_instances, writeTag_fn2).call(this, value2);
        __privateSet(this, _level, __privateGet(this, _level) - 1);
        return result;
      })()}`).join(",")}${fancy && Object.keys(value).length !== 0 ? `
${__privateGet(this, _space).repeat(__privateGet(this, _level) - 1)}` : ""}}`;
    };
    writeIntArray_fn2 = function(value) {
      return `[I;${[...value].map((entry) => __privateMethod(this, _SNBTWriter_instances, writeInt_fn2).call(this, new Int32(entry))).join()}]`;
    };
    writeLongArray_fn2 = function(value) {
      return `[L;${[...value].map((entry) => __privateMethod(this, _SNBTWriter_instances, writeLong_fn2).call(this, entry)).join()}]`;
    };
  }
});

// node_modules/nbtify/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  Float32: () => Float32,
  Int16: () => Int16,
  Int32: () => Int32,
  Int8: () => Int8,
  NBTData: () => NBTData,
  NBTError: () => NBTError,
  NBTReader: () => NBTReader,
  NBTWriter: () => NBTWriter,
  SNBTReader: () => SNBTReader,
  SNBTWriter: () => SNBTWriter,
  TAG: () => TAG,
  TAG_TYPE: () => TAG_TYPE,
  compress: () => compress,
  decompress: () => decompress,
  getTagType: () => getTagType,
  isBedrockLevel: () => isBedrockLevel,
  isCompression: () => isCompression,
  isEndian: () => isEndian,
  isRootName: () => isRootName,
  isRootTagLike: () => isRootTagLike,
  isTag: () => isTag,
  parse: () => parse,
  read: () => read,
  stringify: () => stringify,
  write: () => write
});
var init_dist = __esm({
  "node_modules/nbtify/dist/index.js"() {
    init_read();
    init_write();
    init_parse();
    init_stringify();
    init_format();
    init_tag();
    init_primitive();
    init_error();
    init_compression();
  }
});

// ../src/client/constants.ts
var BLOCK_VERSION = 18153475;
var NBT_DATA_VERSION = 3953;
var DEFAULT_BLOCK = "minecraft:air";
var MASK_BLOCK = DEFAULT_BLOCK;
var MAX_HEIGHT = 256;
var MAX_WIDTH = 256;
var MAX_DEPTH = 256;

// ../src/client/decode.ts
function createImageFrame(imageData) {
  const { width, height, data } = imageData;
  return {
    width,
    height,
    data,
    *[Symbol.iterator]() {
      for (let y = 1; y <= height; y++) {
        for (let x = 1; x <= width; x++) {
          yield [x, y];
        }
      }
    },
    *iterateWithColors() {
      for (let y = 1; y <= height; y++) {
        for (let x = 1; x <= width; x++) {
          const idx = ((y - 1) * width + (x - 1)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          const color = r << 24 | g << 16 | b << 8 | a;
          yield [x, y, color >>> 0];
        }
      }
    }
  };
}
function colorToRGBA(c) {
  return [
    c >> 24 & 255,
    // R
    c >> 16 & 255,
    // G
    c >> 8 & 255,
    // B
    c & 255
    // A
  ];
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function getImageData(img, maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT, clamp = false) {
  let { width, height } = img;
  if (clamp) {
    if (width > maxWidth) {
      height = Math.round(height / width * maxWidth);
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = Math.round(width / height * maxHeight);
      height = maxHeight;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}
async function decodeStaticImage(data, options = {}) {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const imageData = getImageData(img, MAX_WIDTH, MAX_HEIGHT, options.clamp);
    return [createImageFrame(imageData)];
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function decodeBase64(base64, options = {}) {
  const dataUri = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  const img = await loadImage(dataUri);
  const imageData = getImageData(img, MAX_WIDTH, MAX_HEIGHT, options.clamp);
  return [createImageFrame(imageData)];
}
async function decode(input, options = {}) {
  if (typeof input === "string") {
    return decodeBase64(input, options);
  }
  const uint8 = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  return decodeStaticImage(uint8, options);
}
async function decodeFile(file, options = {}) {
  const buffer = await file.arrayBuffer();
  return decode(buffer, options);
}

// ../src/client/lib.ts
function compareStates(a, b) {
  return Object.keys(a).length === Object.keys(b).length && Object.entries(a).sort().toString() === Object.entries(b).sort().toString();
}
function colorDistance(color1, color2) {
  return Math.sqrt(
    (color1[0] - color2[0]) ** 2 + (color1[1] - color2[1]) ** 2 + (color1[2] - color2[2]) ** 2
  );
}
function getNearestColor(color, palette) {
  return palette.reduce(
    (prev, curr) => {
      const distance = colorDistance(color, curr.color.slice(0, 3));
      return distance < prev[0] ? [distance, curr] : prev;
    },
    [Number.POSITIVE_INFINITY, palette[0]]
  )[1];
}
function hex2rgb(hex) {
  return hex.match(/[^#]{1,2}/g)?.map((x) => Number.parseInt(x, 16));
}

// ../src/client/palette.ts
function createPalette(db) {
  const blockPalette = [];
  for (const idx in db) {
    const block = db[idx];
    const [id, color, hexColor, states, version] = typeof block === "string" ? [idx, null, block, {}, BLOCK_VERSION] : [
      block.id,
      block.color ?? null,
      block.hexColor,
      block.states ?? {},
      block.version ?? BLOCK_VERSION
    ];
    blockPalette.push({
      id,
      hexColor,
      color: color ?? (hexColor ? hex2rgb(hexColor) : [0, 0, 0, 0]),
      states,
      version
    });
  }
  return blockPalette;
}

// ../src/client/rotate.ts
function rotateOverY(structure) {
  const {
    size,
    structure: {
      block_indices: [layer]
    }
  } = structure;
  const [width, height, depth] = size;
  const newLayer = Array.from({ length: width * height * depth }, () => -1);
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = z * width * height + y * width + (width - x - 1);
        newLayer[key] = layer[z * width * height + (height - y - 1) * width + x];
      }
    }
  }
  structure.size = [width, depth, height];
  structure.structure.block_indices[0] = newLayer;
  return structure;
}
function rotateOverZ(structure) {
  const {
    size,
    structure: {
      block_indices: [layer]
    }
  } = structure;
  const [width, height, depth] = size;
  const newLayer = Array.from({ length: width * height * depth }, () => -1);
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = z * width * height + y * width + (width - x - 1);
        newLayer[key] = layer[(depth - z - 1) * width * height + y * width + x];
      }
    }
  }
  structure.size = [width, height, depth];
  structure.structure.block_indices[0] = newLayer;
  return structure;
}
function rotateOverX(structure) {
  const {
    size,
    structure: {
      block_indices: [layer]
    }
  } = structure;
  const [width, height, depth] = size;
  const newLayer = Array.from({ length: width * height * depth }, () => -1);
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = z * width * height + y * width + (width - x - 1);
        newLayer[key] = layer[z * width * height + y * width + x];
      }
    }
  }
  structure.size = [depth, height, width];
  structure.structure.block_indices[0] = newLayer;
  return structure;
}
function rotateStructure(structure, axis) {
  if (axis === "y") {
    return rotateOverY(structure);
  }
  if (axis === "z") {
    return rotateOverZ(structure);
  }
  return rotateOverX(structure);
}

// ../src/client/mcstructure.ts
function convertBlock(c, palette) {
  const [r, g, b, a] = colorToRGBA(c);
  if (a < 128) {
    return {
      id: MASK_BLOCK,
      states: {},
      version: BLOCK_VERSION
    };
  }
  const nearestBlock = getNearestColor([r, g, b], palette);
  if (!nearestBlock) {
    return {
      id: DEFAULT_BLOCK,
      states: {},
      version: BLOCK_VERSION
    };
  }
  return {
    id: nearestBlock.id,
    states: nearestBlock.states ?? {},
    version: nearestBlock.version ?? BLOCK_VERSION
  };
}
function findBlock(c, palette, blockPalette) {
  const nearest = convertBlock(c, palette);
  const blockIdx = blockPalette.findIndex(
    ({ name, states }) => name === nearest.id && compareStates(nearest.states, states)
  );
  return [nearest, blockIdx];
}
function constructDecoded(frames, palette, axis = "x") {
  const blockPalette = [];
  const size = [
    frames[0].width,
    frames[0].height,
    frames.length
  ];
  const [width, height, depth] = size;
  const memo = /* @__PURE__ */ new Map();
  const layer = Array.from({ length: width * height * depth }, () => -1);
  const waterLayer = layer.slice();
  const loopDepth = Math.min(MAX_DEPTH, depth);
  for (let z = 0; z < loopDepth; z++) {
    const img = frames[z];
    for (const [y, x, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ?? findBlock(c, palette, blockPalette);
      if (blockIdx === -1) {
        blockIdx = blockPalette.push({
          version: nearest.version ?? BLOCK_VERSION,
          name: nearest.id ?? DEFAULT_BLOCK,
          states: nearest.states ?? {}
        }) - 1;
        memo.set(c, [nearest, blockIdx]);
      }
      const key = (Math.abs(y - height) * width + (width - x)) * depth + z;
      layer[key] = blockIdx;
    }
  }
  const tag = {
    format_version: 1,
    size,
    structure_world_origin: [0, 0, 0],
    structure: {
      block_indices: [layer.filter((i) => i !== -1), waterLayer],
      entities: [],
      palette: {
        default: {
          block_palette: blockPalette,
          block_position_data: {}
        }
      }
    }
  };
  return tag;
}
async function serializeNbt(data, options) {
  const nbt = await Promise.resolve().then(() => (init_dist(), dist_exports));
  const structure = JSON.stringify(data);
  return await nbt.write(nbt.parse(structure), {
    // @ts-expect-error - name is not in the type definition
    name: options.name,
    endian: options.endian,
    compression: null,
    bedrockLevel: false
  });
}
async function createMcStructure(frames, palette, axis = "x", name = "img2mcstructure") {
  const decoded = constructDecoded(frames, palette);
  const structure = axis !== "x" ? rotateStructure(decoded, axis) : decoded;
  return await serializeNbt(structure, { endian: "little", name });
}
async function img2mcstructure(input, options) {
  const { palette, axis = "x", name, decodeOptions } = options;
  const img = input instanceof File ? await decodeFile(input, decodeOptions) : await decode(input, decodeOptions);
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);
  return await createMcStructure(img, blockPalette, axis, name);
}

// ../src/client/mcfunction.ts
function framesToMcfunction(frames, blocks, offset = [0, 0, 0]) {
  const len = Math.min(MAX_DEPTH, frames.length);
  const lines = [];
  for (let z = 0; z < len; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      const [r, g, b, a] = colorToRGBA(c);
      if (a < 128) {
        continue;
      }
      const nearest = getNearestColor([r, g, b], blocks);
      lines.push(
        `setblock ~${Number(x + offset[0])}~${Math.abs(img.height - y + offset[1])}~${offset[2]} ${nearest.id} replace`
      );
    }
  }
  return lines.join("\n");
}
async function img2mcfunction(input, options) {
  const { palette, offset = [0, 0, 0], decodeOptions } = options;
  const frames = input instanceof File ? await decodeFile(input, decodeOptions) : await decode(input, decodeOptions);
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);
  return framesToMcfunction(frames, blockPalette, offset);
}

// ../src/client/schematic.ts
function convertBlock2(c, palette) {
  const [r, g, b, a] = colorToRGBA(c);
  if (a < 128) {
    return MASK_BLOCK;
  }
  const nearestBlock = getNearestColor([r, g, b], palette);
  if (!nearestBlock) {
    return DEFAULT_BLOCK;
  }
  return nearestBlock.id;
}
function findBlock2(c, palette, blockPalette) {
  const nearest = convertBlock2(c, palette);
  const blockIdx = blockPalette.findIndex((n) => n === nearest);
  return [nearest, blockIdx];
}
function constructDecoded2(frames, palette, axis = "x") {
  const size = [
    frames[0].width,
    frames[0].height,
    frames.length
  ];
  const [width, height, depth] = size;
  const memo = /* @__PURE__ */ new Map();
  const blocks = [];
  const blockPalette = [];
  for (let z = 0; z < depth; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ?? findBlock2(c, palette, blockPalette);
      if (blockIdx === -1) {
        blockIdx = blockPalette.push(nearest ?? DEFAULT_BLOCK) - 1;
        memo.set(c, [nearest, blockIdx]);
      }
    }
  }
  const tag = {
    x: 0,
    y: 0,
    z: 0,
    Width: width,
    Height: height,
    Length: depth,
    Data: blocks,
    Blocks: blockPalette,
    Entities: [],
    TileEntities: [],
    Materials: "Alpha"
  };
  return tag;
}
async function createSchematic(frames, palette, axis = "x", name = "img2schematic") {
  const decoded = constructDecoded2(frames, palette, axis);
  const structure = JSON.stringify(decoded, null, 2);
  const nbt = await Promise.resolve().then(() => (init_dist(), dist_exports));
  return await nbt.write(nbt.parse(structure), {
    endian: "big",
    compression: null,
    bedrockLevel: false
  });
}
async function img2schematic(input, options) {
  const { palette, axis = "x", name, decodeOptions } = options;
  const img = input instanceof File ? await decodeFile(input, decodeOptions) : await decode(input, decodeOptions);
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);
  return await createSchematic(img, blockPalette, axis, name);
}

// ../src/client/nbt.ts
function convertBlock3(c, palette) {
  const [r, g, b, a] = colorToRGBA(c);
  if (a < 128) {
    return {
      Name: MASK_BLOCK
    };
  }
  const nearestBlock = getNearestColor([r, g, b], palette);
  if (!nearestBlock) {
    return {
      Name: DEFAULT_BLOCK
    };
  }
  return {
    Name: nearestBlock.id,
    Properties: nearestBlock.states ?? {}
  };
}
function findBlock3(c, palette, blockPalette) {
  const nearest = convertBlock3(c, palette);
  const blockIdx = blockPalette.findIndex(
    ({ Name, Properties }) => Name === nearest.Name && compareStates(nearest.Properties ?? {}, Properties ?? {})
  );
  return [nearest, blockIdx];
}
function constructDecoded3(frames, palette, axis = "x") {
  const size = [
    frames[0].width,
    frames[0].height,
    Math.min(frames.length, MAX_DEPTH)
  ];
  const [width, height, depth] = size;
  const memo = /* @__PURE__ */ new Map();
  const blocks = [];
  const blockPalette = [];
  for (let z = 0; z < depth; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ?? findBlock3(c, palette, blockPalette);
      if (blockIdx === -1) {
        blockIdx = blockPalette.push({
          Name: nearest.Name ?? DEFAULT_BLOCK,
          Properties: nearest.Properties ?? {}
        }) - 1;
        memo.set(c, [nearest, blockIdx]);
      }
      blocks.push({
        pos: axis === "x" ? [y - 1, z, x - 1] : axis === "z" ? [x - 1, z, y - 1] : [x - 1, y - 1, z],
        state: blockIdx
      });
    }
  }
  const tag = {
    size: axis === "y" ? [width, height, depth] : axis === "z" ? [width, depth, height] : [height, depth, width],
    blocks,
    palette: blockPalette,
    entities: [],
    DataVersion: NBT_DATA_VERSION
  };
  return tag;
}
async function createNbtStructure(frames, palette, axis = "x") {
  const decoded = constructDecoded3(frames, palette, axis);
  const structure = JSON.stringify(decoded, null, 2);
  const nbt = await Promise.resolve().then(() => (init_dist(), dist_exports));
  return await nbt.write(nbt.parse(structure), {
    endian: "big",
    compression: null,
    bedrockLevel: false
  });
}
async function img2nbt(input, options) {
  const { palette, axis = "x", decodeOptions } = options;
  const img = input instanceof File ? await decodeFile(input, decodeOptions) : await decode(input, decodeOptions);
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);
  return await createNbtStructure(img, blockPalette, axis);
}

// ../src/client/mod.ts
function downloadBlob(data, filename, mimeType = "application/octet-stream") {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function downloadMcstructure(data, filename = "structure.mcstructure") {
  downloadBlob(data, filename);
}
function downloadMcfunction(data, filename = "function.mcfunction") {
  downloadBlob(data, filename, "text/plain");
}
function downloadSchematic(data, filename = "structure.schematic") {
  downloadBlob(data, filename);
}
function downloadNbt(data, filename = "structure.nbt") {
  downloadBlob(data, filename);
}

// palettes.ts
var minecraftPalette = {
  "minecraft:black_wool": "#1a1c1c",
  "minecraft:blue_wool": "#3c44a4",
  "minecraft:brown_wool": "#835432",
  "minecraft:cyan_wool": "#169c9c",
  "minecraft:gray_wool": "#4c4c4c",
  "minecraft:green_wool": "#667d2d",
  "minecraft:light_blue_wool": "#3a6ea5",
  "minecraft:light_gray_wool": "#999999",
  "minecraft:lime_wool": "#80c71f",
  "minecraft:magenta_wool": "#c74ebd",
  "minecraft:orange_wool": "#e67e22",
  "minecraft:pink_wool": "#d98199",
  "minecraft:purple_wool": "#8932b8",
  "minecraft:red_wool": "#b02e26",
  "minecraft:white_wool": "#e0e0e0",
  "minecraft:yellow_wool": "#e5e533",
  "minecraft:acacia_log": "#a9825c",
  "minecraft:birch_log": "#d7c8a8",
  "minecraft:dark_oak_log": "#664d38",
  "minecraft:jungle_log": "#b8875f",
  "minecraft:oak_log": "#8e734a",
  "minecraft:spruce_log": "#8a6640",
  "minecraft:acacia_planks": "#b5815b",
  "minecraft:birch_planks": "#d7c8a8",
  "minecraft:dark_oak_planks": "#664d38",
  "minecraft:jungle_planks": "#b8875f",
  "minecraft:oak_planks": "#8e734a",
  "minecraft:spruce_planks": "#8a6640",
  "minecraft:acacia_wood": "#b5815b",
  "minecraft:birch_wood": "#d7c8a8",
  "minecraft:dark_oak_wood": "#664d38",
  "minecraft:jungle_wood": "#b8875f",
  "minecraft:oak_wood": "#8e734a",
  "minecraft:spruce_wood": "#8a6640",
  "minecraft:acacia_leaves": "#a9825c",
  "minecraft:birch_leaves": "#d7c8a8",
  "minecraft:dark_oak_leaves": "#664d38",
  "minecraft:jungle_leaves": "#b8875f",
  "minecraft:oak_leaves": "#8e734a",
  "minecraft:spruce_leaves": "#8a6640",
  "minecraft:white_concrete": "#e0e0e0",
  "minecraft:orange_concrete": "#e67e22",
  "minecraft:magenta_concrete": "#c74ebd",
  "minecraft:light_blue_concrete": "#3a6ea5",
  "minecraft:yellow_concrete": "#e5e533",
  "minecraft:lime_concrete": "#80c71f",
  "minecraft:pink_concrete": "#d98199",
  "minecraft:gray_concrete": "#4c4c4c",
  "minecraft:light_gray_concrete": "#acaca4",
  "minecraft:cyan_concrete": "#169c9c",
  "minecraft:purple_concrete": "#8932b8",
  "minecraft:blue_concrete": "#3c44a4",
  "minecraft:brown_concrete": "#835432",
  "minecraft:green_concrete": "#667d2d",
  "minecraft:red_concrete": "#b02e26",
  "minecraft:black_concrete": "#1a1c1c",
  "minecraft:white_concrete_powder": "#e0e0e0",
  "minecraft:orange_concrete_powder": "#e67e22",
  "minecraft:magenta_concrete_powder": "#c74ebd",
  "minecraft:light_blue_concrete_powder": "#3a6ea5",
  "minecraft:yellow_concrete_powder": "#e5e533",
  "minecraft:lime_concrete_powder": "#80c71f",
  "minecraft:pink_concrete_powder": "#d98199",
  "minecraft:gray_concrete_powder": "#4c4c4c",
  "minecraft:light_gray_concrete_powder": "#989892",
  "minecraft:cyan_concrete_powder": "#169c9c",
  "minecraft:purple_concrete_powder": "#8932b8",
  "minecraft:blue_concrete_powder": "#3c44a4",
  "minecraft:brown_concrete_powder": "#835432",
  "minecraft:green_concrete_powder": "#667d2d",
  "minecraft:red_concrete_powder": "#b02e26",
  "minecraft:black_concrete_powder": "#1a1c1c",
  "minecraft:white_terracotta": "#a4a4a4",
  "minecraft:orange_terracotta": "#b5815b",
  "minecraft:magenta_terracotta": "#c74ebd",
  "minecraft:light_blue_terracotta": "#3a6ea5",
  "minecraft:yellow_terracotta": "#e5e533",
  "minecraft:lime_terracotta": "#80c71f",
  "minecraft:pink_terracotta": "#d98199",
  "minecraft:gray_terracotta": "#4c4c4c",
  "minecraft:light_gray_terracotta": "#acaca4",
  "minecraft:cyan_terracotta": "#169c9c",
  "minecraft:purple_terracotta": "#8932b8",
  "minecraft:blue_terracotta": "#3c44a4",
  "minecraft:brown_terracotta": "#835432",
  "minecraft:green_terracotta": "#667d2d",
  "minecraft:red_terracotta": "#b02e26",
  "minecraft:black_terracotta": "#1a1c1c",
  "minecraft:white_stained_glass": "#f4f4f4",
  "minecraft:orange_stained_glass": "#f9801d",
  "minecraft:magenta_stained_glass": "#c74ebd",
  "minecraft:light_blue_stained_glass": "#3a6ea5",
  "minecraft:yellow_stained_glass": "#e5e533",
  "minecraft:lime_stained_glass": "#80c71f",
  "minecraft:pink_stained_glass": "#d98199",
  "minecraft:gray_stained_glass": "#4c4c4c",
  "minecraft:light_gray_stained_glass": "#acaca4",
  "minecraft:cyan_stained_glass": "#169c9c",
  "minecraft:purple_stained_glass": "#8932b8",
  "minecraft:blue_stained_glass": "#3c44a4",
  "minecraft:brown_stained_glass": "#835432",
  "minecraft:green_stained_glass": "#667d2d",
  "minecraft:red_stained_glass": "#b02e26",
  "minecraft:black_stained_glass": "#1a1c1c"
};
var rgbPalette = [
  {
    color: [255, 255, 255],
    hexColor: "#ffffff",
    id: "rgb:rgb",
    states: { "rgb:permute": 0 },
    version: 18090528
  },
  {
    color: [255, 0, 0],
    hexColor: "#ff0000",
    id: "rgb:rgb",
    states: { "rgb:permute": 1 },
    version: 18090528
  },
  {
    color: [0, 255, 0],
    hexColor: "#00ff00",
    id: "rgb:rgb",
    states: { "rgb:permute": 2 },
    version: 18090528
  },
  {
    color: [0, 0, 255],
    hexColor: "#0000ff",
    id: "rgb:rgb",
    states: { "rgb:permute": 3 },
    version: 18090528
  },
  {
    color: [255, 255, 0],
    hexColor: "#ffff00",
    id: "rgb:rgb",
    states: { "rgb:permute": 4 },
    version: 18090528
  },
  {
    color: [0, 255, 255],
    hexColor: "#00ffff",
    id: "rgb:rgb",
    states: { "rgb:permute": 5 },
    version: 18090528
  },
  {
    color: [255, 0, 255],
    hexColor: "#ff00ff",
    id: "rgb:rgb",
    states: { "rgb:permute": 6 },
    version: 18090528
  },
  {
    color: [0, 0, 0],
    hexColor: "#000000",
    id: "rgb:rgb",
    states: { "rgb:permute": 7 },
    version: 18090528
  }
];
var glassPalette = {
  "minecraft:white_stained_glass": "#f4f4f4",
  "minecraft:orange_stained_glass": "#f9801d",
  "minecraft:magenta_stained_glass": "#c74ebd",
  "minecraft:light_blue_stained_glass": "#3a6ea5",
  "minecraft:yellow_stained_glass": "#e5e533",
  "minecraft:lime_stained_glass": "#80c71f",
  "minecraft:pink_stained_glass": "#d98199",
  "minecraft:gray_stained_glass": "#4c4c4c",
  "minecraft:light_gray_stained_glass": "#acaca4",
  "minecraft:cyan_stained_glass": "#169c9c",
  "minecraft:purple_stained_glass": "#8932b8",
  "minecraft:blue_stained_glass": "#3c44a4",
  "minecraft:brown_stained_glass": "#835432",
  "minecraft:green_stained_glass": "#667d2d",
  "minecraft:red_stained_glass": "#b02e26",
  "minecraft:black_stained_glass": "#1a1c1c"
};
var concretePalette = {
  "minecraft:white_concrete": "#e0e0e0",
  "minecraft:orange_concrete": "#e67e22",
  "minecraft:magenta_concrete": "#c74ebd",
  "minecraft:light_blue_concrete": "#3a6ea5",
  "minecraft:yellow_concrete": "#e5e533",
  "minecraft:lime_concrete": "#80c71f",
  "minecraft:pink_concrete": "#d98199",
  "minecraft:gray_concrete": "#4c4c4c",
  "minecraft:light_gray_concrete": "#acaca4",
  "minecraft:cyan_concrete": "#169c9c",
  "minecraft:purple_concrete": "#8932b8",
  "minecraft:blue_concrete": "#3c44a4",
  "minecraft:brown_concrete": "#835432",
  "minecraft:green_concrete": "#667d2d",
  "minecraft:red_concrete": "#b02e26",
  "minecraft:black_concrete": "#1a1c1c"
};
var woolPalette = {
  "minecraft:white_wool": "#e0e0e0",
  "minecraft:orange_wool": "#e67e22",
  "minecraft:magenta_wool": "#c74ebd",
  "minecraft:light_blue_wool": "#3a6ea5",
  "minecraft:yellow_wool": "#e5e533",
  "minecraft:lime_wool": "#80c71f",
  "minecraft:pink_wool": "#d98199",
  "minecraft:gray_wool": "#4c4c4c",
  "minecraft:light_gray_wool": "#999999",
  "minecraft:cyan_wool": "#169c9c",
  "minecraft:purple_wool": "#8932b8",
  "minecraft:blue_wool": "#3c44a4",
  "minecraft:brown_wool": "#835432",
  "minecraft:green_wool": "#667d2d",
  "minecraft:red_wool": "#b02e26",
  "minecraft:black_wool": "#1a1c1c"
};
var palettes = {
  minecraft: minecraftPalette,
  rgb: rgbPalette,
  glass: glassPalette,
  concrete: concretePalette,
  wool: woolPalette
};

// index.ts
var imageInput;
var paletteSelect;
var formatSelect;
var axisSelect;
var convertBtn;
var previewCanvas;
var statusEl;
var downloadSection;
var filenameInput;
var currentFile = null;
var lastResult = null;
var lastFormat = "";
function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}
async function previewImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const ctx = previewCanvas.getContext("2d");
      const maxSize = 256;
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = height / width * maxSize;
          width = maxSize;
        } else {
          width = width / height * maxSize;
          height = maxSize;
        }
      }
      previewCanvas.width = width;
      previewCanvas.height = height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = e.target?.result;
  };
  reader.readAsDataURL(file);
}
function getSelectedPalette() {
  const paletteName = paletteSelect.value;
  return palettes[paletteName];
}
async function convert() {
  if (!currentFile) {
    setStatus("Please select an image file", "error");
    return;
  }
  setStatus("Converting...", "info");
  convertBtn.disabled = true;
  try {
    const palette = getSelectedPalette();
    const axis = axisSelect.value;
    const format = formatSelect.value;
    let result;
    switch (format) {
      case "mcstructure":
        result = await img2mcstructure(currentFile, { palette, axis });
        break;
      case "mcfunction":
        result = await img2mcfunction(currentFile, { palette });
        break;
      case "schematic":
        result = await img2schematic(currentFile, { palette, axis });
        break;
      case "nbt":
        result = await img2nbt(currentFile, { palette, axis });
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
    lastResult = result;
    lastFormat = format;
    downloadSection.style.display = "block";
    const baseName = currentFile.name.replace(/\.[^.]+$/, "");
    filenameInput.value = `${baseName}.${format}`;
    const size = typeof result === "string" ? new TextEncoder().encode(result).length : result.length;
    setStatus(`Conversion complete! Size: ${(size / 1024).toFixed(2)} KB`, "success");
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
  } finally {
    convertBtn.disabled = false;
  }
}
function download() {
  if (!lastResult) {
    setStatus("No converted file to download", "error");
    return;
  }
  const filename = filenameInput.value || `structure.${lastFormat}`;
  switch (lastFormat) {
    case "mcstructure":
      downloadMcstructure(lastResult, filename);
      break;
    case "mcfunction":
      downloadMcfunction(lastResult, filename);
      break;
    case "schematic":
      downloadSchematic(lastResult, filename);
      break;
    case "nbt":
      downloadNbt(lastResult, filename);
      break;
  }
}
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add("drag-over");
}
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("drag-over");
}
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("drag-over");
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type.startsWith("image/")) {
      currentFile = file;
      previewImage(file);
      setStatus(`Selected: ${file.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    } else {
      setStatus("Please drop an image file", "error");
    }
  }
}
function init() {
  imageInput = document.getElementById("imageInput");
  paletteSelect = document.getElementById("paletteSelect");
  formatSelect = document.getElementById("formatSelect");
  axisSelect = document.getElementById("axisSelect");
  convertBtn = document.getElementById("convertBtn");
  previewCanvas = document.getElementById("previewCanvas");
  statusEl = document.getElementById("status");
  downloadSection = document.getElementById("downloadSection");
  filenameInput = document.getElementById("filenameInput");
  const dropZone = document.getElementById("dropZone");
  const downloadBtn = document.getElementById("downloadBtn");
  imageInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      currentFile = files[0];
      previewImage(currentFile);
      setStatus(`Selected: ${currentFile.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    }
  });
  convertBtn.addEventListener("click", convert);
  downloadBtn.addEventListener("click", download);
  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("dragleave", handleDragLeave);
  dropZone.addEventListener("drop", handleDrop);
  dropZone.addEventListener("click", () => imageInput.click());
  setStatus("Ready - Select an image to convert", "info");
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
