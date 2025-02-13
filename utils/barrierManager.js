// barrier manager which sends commands to the barrier to open and close the barrier

const { initialize } = require("./socketManager");
const AxiosDigestAuth = require('axios-digest-auth');

let digestAuth = new AxiosDigestAuth({
    username: "admin",
    password: "Liquidlab@1234",
  });

const BarrierManager = {

    openBarrier: async () => {
        console.log("Opening barrier");
        // send command to the barrier to open
        const response = await digestAuth.request({
            headers: { Accept: "application/json" },
            method: "GET",
            url: "http://192.168.1.108/cgi-bin/trafficSnap.cgi?action=openStrobe&channel=1&info.openType=Normal&info.plateNumber=046XRW",
        });
        console.log(response)   
    },
    closeBarrier: async () => {
        console.log("Closing barrier");
        // send command to the barrier to close
        const response = await digestAuth.request({
            headers: { Accept: "application/json" },
            method: "GET",
            url: "http://192.168.1.108/cgi-bin/trafficSnap.cgi?action=closeStrobe&channel=1",
        });
        console.log(response)
    }
}


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