
export const fetchIpAddresses = () => {
  return [
    {
      name: "walrus-prod.blockscope.net",
      ipAddress: "ip1",
      hostingService: "TeraSwitch Networks Inc.",
      location: {
        latitude: 37.7749,   
        longitude: -122.4194, 
        region: "North America", 
        altitude: 10, 
      }
    },
    {
      name: "walrus-testnet.blockscope.net",
      ipAddress: "ip2",
      hostingService: "Comvive Servidores S.L.",
      location: {
        latitude: 40.7128,   
        longitude: -74.0060, 
        region: "Europe",    
        altitude: 5,         
      }
    },
    {
      name: "153-gb3-val-walrus-aggregator.stakesquid.com",
      ipAddress: "ip3",
      hostingService: "DIGI ROMANIA S.A.",
      location: {
        latitude: 44.4268,   
        longitude: 26.1025,  
        region: "Eastern Europe",
        altitude: 20,        
      }
    },
  ];

}
