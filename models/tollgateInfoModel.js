const mongoose = require('mongoose');

const plateSchema = new mongoose.Schema({
    boundingBox: [Number],
    channel: { type: Number, default: 0 },
    confidence: { type: Number, required: true },
    isExist: { type: Boolean, default: true },
    plateColor: { type: String },
    plateNumber: { type: String, required: true },
    plateType: { type: String },
    region: { type: String },
    uploadNum: { type: Number }
});

const snapInfoSchema = new mongoose.Schema({
    accurateTime: { type: String },
    allowUser: { type: Boolean, default: false },
    allowUserEndTime: { type: String },
    dstTune: { type: Number },
    defenceCode: { type: String },
    deviceId: { type: String, required: true },
    direction: { type: String },
    inCarPeopleNum: { type: Number },
    lanNo: { type: Number },
    openStrobe: { type: Boolean },
    snapTime: { type: String },
    timeZone: { type: Number }
});

const vehicleSchema = new mongoose.Schema({
    speed: { type: Number },
    vehicleBoundingBox: [Number],
    vehicleColor: { type: String },
    vehicleSeries: { type: String },
    vehicleType: { type: String }
});

const tollgateInfoSchema = new mongoose.Schema({
    picture: {
        plate: plateSchema,
        snapInfo: snapInfoSchema,
        vehicle: vehicleSchema
    }
}, { timestamps: true });

// Add a pre-save middleware to log the required information
tollgateInfoSchema.pre('save', function(next) {
    console.log('📸 Tollgate Detection:', {
        vehicleNumber: this.picture.plate.plateNumber,
        deviceId: this.picture.snapInfo.deviceId,
        vehicleType: this.picture.vehicle.vehicleType,
        confidence: this.picture.plate.confidence,
        timestamp: this.picture.snapInfo.accurateTime
    });
    next();
});

const TollgateInfo = mongoose.model('TollgateInfo', tollgateInfoSchema);

module.exports = TollgateInfo; 