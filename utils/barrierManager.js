// barrier manager which sends commands to the barrier to open and close the barrier

const AxiosDigestAuth = require('@mhoc/axios-digest-auth').default;

let digestAuth = new AxiosDigestAuth({
    username: "admin",
    password: "admin@12345",
  });

const BarrierManager = {

    openBarrier: async () => {
        console.log("Opening barrier");
        // send command to the barrier to open
        const response = await digestAuth.request({
            headers: { Accept: "application/json" },
            method: "GET",
            url: "http://192.168.1.250/cgi-bin/configManager.cgi?action=setConfig&AlarmOut[1].Mode=1&AlarmOut[0].Name=port1",
        });
        //delay for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        // send command to the barrier to close
        const response2 = await digestAuth.request({
            headers: { Accept: "application/json" },
            method: "GET",
            url: "http://192.168.1.250/cgi-bin/configManager.cgi?action=setConfig&AlarmOut[1].Mode=0&AlarmOut[0].Name=port1",
        });
        console.log(response)   
    },
    closeBarrier: async () => {
        console.log("Closing barrier");
        // send command to the barrier to close
        const response = await digestAuth.request({
            headers: { Accept: "application/json" },
            method: "GET",
            url: "http://192.168.1.250/cgi-bin/trafficSnap.cgi?action=closeStrobe&channel=1",
        });
        console.log(response)
    }
}

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