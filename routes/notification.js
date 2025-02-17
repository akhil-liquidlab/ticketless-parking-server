const express = require('express');
const router = express.Router();
const vehicleValidation = require('../controllers/parkingController');
const BarrierManager = require('../utils/barrierManager');
const Booth = require('../models/boothModel');
const ANPRCamera = require('../models/anprCameraModel');

router.post('/TollgateInfo', async (req, res) => {
    console.log("TollgateInfo");
    console.log("captured: ", req.body.Picture.Plate.Confidence, "plate number: ", req.body.Picture.Plate.PlateNumber,"\n");

    // Extract the camera device ID from the request
    const cameraId = req.body.Picture.SnapInfo.DeviceID; // This is the camera device ID

    // get the object id of the camera
    const cameraDevice = await ANPRCamera.findOne({ 'camera_id': cameraId });
    if (!cameraDevice) {
        return res.status(404).json({ message: 'Camera device not found for the provided camera device ID' });
    }

    // get the booth code from the camera device
    const booth = await Booth.findOne({ 'cameraDevices': { $in: [cameraDevice._id] } });
    if (!booth) {
        return res.status(404).json({ message: 'Booth not found for the provided camera device ID' });
    }

    // Extract only necessary fields
    const vehicleData = {
        vehicle_no: req.body.Picture.Plate.PlateNumber,
        vehicle_type: req.body.Picture.Vehicle.VehicleType === 'Motorcycle' ? '2' :
            req.body.Picture.Vehicle.VehicleType === 'SUV' ||
                req.body.Picture.Vehicle.VehicleType === 'PassengerCar' ||
                req.body.Picture.Vehicle.VehicleType === 'Car' ||
                req.body.Picture.Vehicle.VehicleType === 'Sedan' ? '4' :
                req.body.Picture.Vehicle.VehicleType === 'Truck' ||
                    req.body.Picture.Vehicle.VehicleType === 'Bus' ||
                    req.body.Picture.Vehicle.VehicleType === 'Van' ||
                    req.body.Picture.Vehicle.VehicleType === 'Lorry' ? '6' : '3',
        // device_id: cameraDeviceId, // Use the camera device ID/
        booth_code: booth.booth_code // Pass the booth code found from the booth
    };

    // Simply modify the body
    req.body = vehicleData;
    vehicleValidation.validateVehicleEntry(req, res);
});

// for DeviceInfo
router.post('/DeviceInfo', (req, res) => {
    // console.log("DeviceInfo");
    console.log(req.body);
    res.status(200).json({ message: 'Data received' });
});

// /NotificationInfo/KeepAlive
router.post('/KeepAlive', async (req, res) => {
    console.log("KeepAlive");
    console.log(req.body);

    // open the barrier
    // await BarrierManager.openBarrier();

    // return {};

    // // dummy data
    // const vehicleData = {
    //     vehicle_no: "KL01AB1234",
    //     vehicle_type: "4",
    //     device_id: "D001",
    //     booth_code: "B001"
    // };

    // // Simply modify the body of the request
    // req.body = vehicleData;
    // vehicleValidation.validateVehicleExit(req, res);
});

module.exports = router;