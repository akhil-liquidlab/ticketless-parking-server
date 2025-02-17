// barrier manager which sends commands to the barrier to open and close the barrier

const AxiosDigestAuth = require('@mhoc/axios-digest-auth').default;
const Booth = require('../models/boothModel'); // Import the Booth model
const ANPRCamera = require('../models/anprCameraModel'); // Import the ANPRCamera model
const socketManager = require('./socketManager'); // Import the socket manager

let digestAuth = new AxiosDigestAuth({
    username: "admin",
    password: "admin@12345",
});

const BarrierManager = {
    async openBarrier(booth_code) {
        try {
            // Find the booth by booth_code
            const booth = await Booth.findOne({ booth_code });
            if (!booth) {
                throw new Error('Booth not found');
            }

            // Check if the booth has an associated ANPR camera
            if (booth.cameraDevices.length === 0) {
                throw new Error('No ANPR camera connected to this booth');
            }

            // Get the first camera ID from the booth's cameraDevices array
            const anprCameraId = booth.cameraDevices[0];

            // Find the ANPR camera by its ID to get the IP address
            const anprCamera = await ANPRCamera.findById(anprCameraId);
            if (!anprCamera) {
                throw new Error('ANPR camera not found');
            }

            // Send the open command to the ANPR camera using its IP address
            const response = await digestAuth.request({
                headers: { Accept: "application/json" },
                method: "GET",
                url: `http://${anprCamera.ip_address}/cgi-bin/configManager.cgi?action=setConfig&AlarmOut[1].Mode=1&AlarmOut[0].Name=port1`, // Use the camera's IP address
            });

            // one second delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response2 = await digestAuth.request({
                headers: { Accept: "application/json" },
                method: "GET",
                url: `http://${anprCamera.ip_address}/cgi-bin/configManager.cgi?action=setConfig&AlarmOut[1].Mode=0&AlarmOut[0].Name=port1`, // Use the camera's IP address
            });


            console.log(`Opening barrier for booth ${booth_code}`);
            // console.log(response);

            // Emit an event to notify that the barrier has been opened
            // socketManager.emitToDevice(booth_code, 'barrier', 'open', { message: 'Barrier opened' });
        } catch (error) {
            console.error('Error opening barrier:', error.message);
            throw error; // Rethrow the error for further handling
        }
    },

    async closeBarrier(booth_code) {
        try {
            // Find the booth by booth_code
            const booth = await Booth.findOne({ booth_code });
            if (!booth) {
                throw new Error('Booth not found');
            }

            // Check if the booth has an associated ANPR camera
            if (booth.cameraDevices.length === 0) {
                throw new Error('No ANPR camera connected to this booth');
            }

            // Get the first camera ID from the booth's cameraDevices array
            const anprCameraId = booth.cameraDevices[0];

            // Find the ANPR camera by its ID to get the IP address
            const anprCamera = await ANPRCamera.findById(anprCameraId);
            if (!anprCamera) {
                throw new Error('ANPR camera not found');
            }

            // Send the close command to the ANPR camera using its IP address
            const response = await digestAuth.request({
                headers: { Accept: "application/json" },
                method: "GET",
                url: `http://${anprCamera.ip_address}/cgi-bin/configManager.cgi?action=setConfig&AlarmOut[1].Mode=0&AlarmOut[0].Name=port1`, // Use the camera's IP address
            });

            console.log(`Closing barrier for booth ${booth_code}`);
            console.log(response);

            // Emit an event to notify that the barrier has been closed
            // socketManager.emitToDevice(booth_code, 'barrier', 'close', { message: 'Barrier closed' });
        } catch (error) {
            console.error('Error closing barrier:', error.message);
            throw error; // Rethrow the error for further handling
        }
    }
};

module.exports = BarrierManager;

// const testBarrierOpen = async () => {
//     const response = await digestAuth.request({
//       headers: { Accept: "application/json" },
//       method: "GET",
//       url: "http://192.168.1.108/cgi-bin/trafficSnap.cgi?action=openStrobe&channel=1&info.openType=Normal&info.plateNumber=046XRW",
//     });
//     console.log(response)
//   }

// const digestAuth = new AxiosDigestAuth({
//     username: "admin",
//     password: "Liquidlab@1234",
//   });