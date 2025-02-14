const express = require('express');
const router = express.Router();
const vehicleValidation = require('../controllers/parkingController');
const BarrierManager = require('../utils/barrierManager');

router.post('/TollgateInfo', (req, res) => {
    console.log("TollgateInfo");
    console.log(req.body);

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
        device_id: "D001",
        booth_code: "B001"
    };

    // Simply modify the body
    req.body = vehicleData;
    vehicleValidation.validateVehicleEntry(req, res);
});

// for DeviceInfo
router.post('/DeviceInfo', (req, res) => {
    console.log("DeviceInfo");
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