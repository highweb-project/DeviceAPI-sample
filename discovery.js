var myAddress = /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/;
var myCAddress = /[0-9]+\.[0-9]+\.[0-9]+\./;
function findServer(displayAddrs, myIpAddrs, callback)
{
  console.log(displayAddrs + ", " + myIpAddrs);
  totalCnt = 0;
  checkedCnt = 0;
  var serverAddr = new Array();
  for(var i=2; i<=254; i++) {
    var ip = "ws://" + displayAddrs + i + ":20000";
    var soc = new WebSocket(ip);

    (function(ip, soc) {
    try {
      
      soc.onopen = function(evt) {
        callback(ip, "ws://" + myIpAddrs + ":20000");
      };
      soc.onclose = function(evt) {
      };
      soc.onmessage = function(evt) {
      };
      soc.onerror = function(evt) {
        ++checkedCnt;
      };    
      var timeout = setTimeout(function() {
        if(soc.readyState == WebSocket.CONNECTING) {
          soc.close();
        }
      }, 5000);
    } catch (err) {
    }
    })(ip, soc);

    totalCnt++;
  }
}

var RTCPeerConnection = /*window.RTCPeerConnection ||*/ window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
function findDiscovery(callback) {
if (RTCPeerConnection) (function () {
    var rtc = new RTCPeerConnection({iceServers:[]});
    if (1 || window.mozRTCPeerConnection) {      // FF [and now Chrome!] needs a channel/stream to proceed
        rtc.createDataChannel('', {reliable:false});
    };
    
    rtc.onicecandidate = function (evt) {
        // convert the candidate to SDP so we can run it through our general parser
        // see https://twitter.com/lancestout/status/525796175425720320 for details
        if (evt.candidate) grepSDP("a="+evt.candidate.candidate);
    };
    rtc.createOffer(function (offerDesc) {
        grepSDP(offerDesc.sdp);
        rtc.setLocalDescription(offerDesc);
    }, function (e) { console.warn("offer failed", e); });
    
    
    var addrs = Object.create(null);
    var myAddrs;
    addrs["0.0.0."] = false;
    function updateDisplay(newAddr) {
        var newCAddr = myCAddress.exec(newAddr);
        console.log("newAddrs " + newAddr + ", " + newCAddr);
        if (newCAddr in addrs || newCAddr == null) return;
        else addrs[newCAddr] = true;
        var displayAddrs = Object.keys(addrs).filter(function (k) { return addrs[k]; });
        findServer(displayAddrs, newAddr, callback);
    }
    
    function grepSDP(sdp) {
        var hosts = [];
        sdp.split('\r\n').forEach(function (line) { // c.f. http://tools.ietf.org/html/rfc4566#page-39
            if (~line.indexOf("a=candidate")) {     // http://tools.ietf.org/html/rfc4566#section-5.13
                var parts = line.split(' '),        // http://tools.ietf.org/html/rfc5245#section-15.1
                    addr = parts[4],
                    type = parts[7];
                    console.log("addrs : " + addr + ", " + type);
                    var address = myAddress.exec(addr);
                for(var i = 0; i < address.length; i++) {
                  if (address[i] != 0 && type === 'host') updateDisplay(address[i]);
                }
            } else if (~line.indexOf("c=")) {       // http://tools.ietf.org/html/rfc4566#section-5.7
                var parts = line.split(' '),
                    addr = parts[2];
                var address = myAddress.exec(addr);
                console.log("addr : " + addr);
                for(var i = 0; i < address.length; i++) {
                  if (address[i] != 0) {
                    updateDisplay(address[i]);
                  }
                }
            }
        });
    }
})(); else {
  console.error("RTCPeerConnection not support");
}
}