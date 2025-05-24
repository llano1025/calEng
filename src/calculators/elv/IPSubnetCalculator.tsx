import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface IPSubnetCalculatorProps {
  onShowTutorial?: () => void;
}

interface SubnetResult {
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  cidr: number;
  totalHosts: number;
  usableHosts: number;
  firstUsableIP: string;
  lastUsableIP: string;
  wildcardMask: string;
  networkBinary: string;
  broadcastBinary: string;
  subnetMaskBinary: string;
}

interface VLSMSubnet {
  id: string;
  name: string;
  requiredHosts: number;
  allocatedCIDR: number;
  networkAddress: string;
  subnetMask: string;
  firstUsableIP: string;
  lastUsableIP: string;
  broadcastAddress: string;
  actualHosts: number;
}

const IPSubnetCalculator: React.FC<IPSubnetCalculatorProps> = ({ onShowTutorial }) => {
  // State for the active tab
  const [activeTab, setActiveTab] = useState<'basic' | 'vlsm'>('basic');
  
  // Basic subnet calculator state
  const [ipAddress, setIpAddress] = useState<string>('192.168.1.1');
  const [cidrNotation, setCidrNotation] = useState<number>(24);
  const [customSubnetMask, setCustomSubnetMask] = useState<string>('255.255.255.0');
  const [useCustomMask, setUseCustomMask] = useState<boolean>(false);
  const [calculationResult, setCalculationResult] = useState<SubnetResult | null>(null);
  const [isValidInput, setIsValidInput] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // VLSM calculator state
  const [majorNetwork, setMajorNetwork] = useState<string>('192.168.1.0');
  const [majorNetworkCIDR, setMajorNetworkCIDR] = useState<number>(24);

  // Private network ranges
  const privateNetworkRanges = [
    { 
      class: 'Class A', 
      network: '10.0.0.0', 
      cidr: 8, 
      description: '10.0.0.0/8 (16.7M addresses)',
      example: '10.0.0.1'
    },
    { 
      class: 'Class B', 
      network: '172.16.0.0', 
      cidr: 12, 
      description: '172.16.0.0/12 (1M addresses)',
      example: '172.16.0.1'
    },
    { 
      class: 'Class C', 
      network: '192.168.0.0', 
      cidr: 16, 
      description: '192.168.0.0/16 (65K addresses)',
      example: '192.168.1.1'
    }
  ];
  const [vlsmSubnets, setVlsmSubnets] = useState<VLSMSubnet[]>([
    {
      id: '1',
      name: 'VLAN 10 - Servers',
      requiredHosts: 30,
      allocatedCIDR: 0,
      networkAddress: '',
      subnetMask: '',
      firstUsableIP: '',
      lastUsableIP: '',
      broadcastAddress: '',
      actualHosts: 0
    }
  ]);
  const [vlsmCalculated, setVlsmCalculated] = useState<boolean>(false);

  // Utility functions
  const ipToDecimal = (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  };

  const decimalToIP = (decimal: number): string => {
    return [
      (decimal >>> 24) & 255,
      (decimal >>> 16) & 255,
      (decimal >>> 8) & 255,
      decimal & 255
    ].join('.');
  };

  const cidrToSubnetMask = (cidr: number): string => {
    const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    return decimalToIP(mask);
  };

  const subnetMaskToCIDR = (mask: string): number => {
    const decimal = ipToDecimal(mask);
    return 32 - Math.log2((~decimal >>> 0) + 1);
  };

  const validateIP = (ip: string): boolean => {
    const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
  };

  const decimalToBinary = (decimal: number): string => {
    return decimal.toString(2).padStart(32, '0');
  };

  const formatBinary = (binary: string): string => {
    return binary.match(/.{1,8}/g)?.join('.') || binary;
  };

  // Calculate subnet information
  const calculateSubnet = (ip: string, cidr: number): SubnetResult | null => {
    if (!validateIP(ip) || cidr < 0 || cidr > 32) {
      return null;
    }

    const ipDecimal = ipToDecimal(ip);
    const subnetMask = cidrToSubnetMask(cidr);
    const subnetMaskDecimal = ipToDecimal(subnetMask);
    
    const networkDecimal = (ipDecimal & subnetMaskDecimal) >>> 0;
    const broadcastDecimal = (networkDecimal | (~subnetMaskDecimal >>> 0)) >>> 0;
    
    const totalHosts = Math.pow(2, 32 - cidr);
    const usableHosts = Math.max(0, totalHosts - 2);
    
    const firstUsableDecimal = networkDecimal + 1;
    const lastUsableDecimal = broadcastDecimal - 1;
    
    const wildcardMask = decimalToIP((~subnetMaskDecimal >>> 0));

    return {
      networkAddress: decimalToIP(networkDecimal),
      broadcastAddress: decimalToIP(broadcastDecimal),
      subnetMask: subnetMask,
      cidr: cidr,
      totalHosts: totalHosts,
      usableHosts: usableHosts,
      firstUsableIP: decimalToIP(firstUsableDecimal),
      lastUsableIP: decimalToIP(lastUsableDecimal),
      wildcardMask: wildcardMask,
      networkBinary: formatBinary(decimalToBinary(networkDecimal)),
      broadcastBinary: formatBinary(decimalToBinary(broadcastDecimal)),
      subnetMaskBinary: formatBinary(decimalToBinary(subnetMaskDecimal))
    };
  };

  // Calculate basic subnet when inputs change
  useEffect(() => {
    try {
      let cidr = cidrNotation;
      
      if (useCustomMask) {
        if (!validateIP(customSubnetMask)) {
          setIsValidInput(false);
          setErrorMessage('Invalid subnet mask format');
          setCalculationResult(null);
          return;
        }
        cidr = subnetMaskToCIDR(customSubnetMask);
      }

      const result = calculateSubnet(ipAddress, cidr);
      if (result) {
        setCalculationResult(result);
        setIsValidInput(true);
        setErrorMessage('');
      } else {
        setIsValidInput(false);
        setErrorMessage('Invalid IP address or CIDR notation');
        setCalculationResult(null);
      }
    } catch (error) {
      setIsValidInput(false);
      setErrorMessage('Calculation error occurred');
      setCalculationResult(null);
    }
  }, [ipAddress, cidrNotation, customSubnetMask, useCustomMask]);

  // VLSM Functions
  const addVLSMSubnet = () => {
    const newSubnet: VLSMSubnet = {
      id: Date.now().toString(),
      name: '',
      requiredHosts: 10,
      allocatedCIDR: 0,
      networkAddress: '',
      subnetMask: '',
      firstUsableIP: '',
      lastUsableIP: '',
      broadcastAddress: '',
      actualHosts: 0
    };
    setVlsmSubnets([...vlsmSubnets, newSubnet]);
  };

  const removeVLSMSubnet = (id: string) => {
    if (vlsmSubnets.length > 1) {
      setVlsmSubnets(vlsmSubnets.filter(subnet => subnet.id !== id));
    }
  };

  const updateVLSMSubnet = (id: string, field: keyof VLSMSubnet, value: any) => {
    setVlsmSubnets(vlsmSubnets.map(subnet => 
      subnet.id === id ? { ...subnet, [field]: value } : subnet
    ));
  };

  const calculateVLSM = () => {
    if (!validateIP(majorNetwork)) {
      setErrorMessage('Invalid major network address');
      return;
    }

    // Sort subnets by required hosts (descending)
    const sortedSubnets = [...vlsmSubnets].sort((a, b) => b.requiredHosts - a.requiredHosts);
    
    let currentNetwork = ipToDecimal(majorNetwork);
    const updatedSubnets: VLSMSubnet[] = [];

    for (const subnet of sortedSubnets) {
      // Calculate required CIDR for hosts
      const requiredCIDR = 32 - Math.ceil(Math.log2(subnet.requiredHosts + 2));
      const actualHosts = Math.pow(2, 32 - requiredCIDR) - 2;
      
      // Align to subnet boundary
      const subnetSize = Math.pow(2, 32 - requiredCIDR);
      currentNetwork = Math.floor(currentNetwork / subnetSize) * subnetSize;
      
      const broadcastDecimal = currentNetwork + subnetSize - 1;
      const subnetMask = cidrToSubnetMask(requiredCIDR);
      
      updatedSubnets.push({
        ...subnet,
        allocatedCIDR: requiredCIDR,
        networkAddress: decimalToIP(currentNetwork),
        subnetMask: subnetMask,
        firstUsableIP: decimalToIP(currentNetwork + 1),
        lastUsableIP: decimalToIP(broadcastDecimal - 1),
        broadcastAddress: decimalToIP(broadcastDecimal),
        actualHosts: actualHosts
      });
      
      currentNetwork = broadcastDecimal + 1;
    }

    // Restore original order
    const orderedSubnets = vlsmSubnets.map(original => 
      updatedSubnets.find(updated => updated.id === original.id)!
    );

    setVlsmSubnets(orderedSubnets);
    setVlsmCalculated(true);
  };

  const resetVLSM = () => {
    setVlsmCalculated(false);
  };

  // Handle private network range selection
  const selectPrivateRange = (range: typeof privateNetworkRanges[0]) => {
    if (activeTab === 'basic') {
      setIpAddress(range.example);
      setCidrNotation(24); // Default to /24 for practical subnetting
      setUseCustomMask(false);
    } else {
      setMajorNetwork(range.network);
      setMajorNetworkCIDR(24); // Default to /24 for VLSM
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">IP Address and Subnet Calculator</h2>
        {onShowTutorial && (
          <button 
            onClick={onShowTutorial} 
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <span className="mr-1">Tutorial</span>
            <Icons.InfoInline />
          </button>
        )}
      </div>

      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'basic'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Subnet Calculator
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'vlsm'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('vlsm')}
        >
          VLSM Calculator
        </button>
      </div>
      
      {/* Content Based on Active Tab */}
      {activeTab === 'basic' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-4">Network Parameters</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="192.168.1.1"
              />
            </div>

            {/* Private Network Range Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Select Private Networks
              </label>
              <div className="grid grid-cols-1 gap-2">
                {privateNetworkRanges.map((range) => (
                  <button
                    key={range.class}
                    onClick={() => selectPrivateRange(range)}
                    className="text-left p-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="font-medium text-gray-800">{range.class}</div>
                    <div className="text-sm text-gray-600">{range.description}</div>
                    <div className="text-xs text-blue-600 mt-1">Example: {range.example}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  id="cidr-input"
                  name="input-method"
                  checked={!useCustomMask}
                  onChange={() => setUseCustomMask(false)}
                  className="mr-2"
                />
                <label htmlFor="cidr-input" className="text-sm font-medium text-gray-700">
                  CIDR Notation
                </label>
              </div>
              <div className="flex items-center">
                <span className="mr-2">/</span>
                <input
                  type="number"
                  min="0"
                  max="32"
                  value={cidrNotation}
                  onChange={(e) => setCidrNotation(Number(e.target.value))}
                  disabled={useCustomMask}
                  className="w-20 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  id="mask-input"
                  name="input-method"
                  checked={useCustomMask}
                  onChange={() => setUseCustomMask(true)}
                  className="mr-2"
                />
                <label htmlFor="mask-input" className="text-sm font-medium text-gray-700">
                  Subnet Mask
                </label>
              </div>
              <input
                type="text"
                value={customSubnetMask}
                onChange={(e) => setCustomSubnetMask(e.target.value)}
                disabled={!useCustomMask}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="255.255.255.0"
              />
            </div>

            {!isValidInput && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
                <p className="text-red-700 font-medium">Error</p>
                <p className="text-red-600 text-sm">{errorMessage}</p>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-700 mb-2">Common CIDR Notations</h4>
              <div className="grid grid-cols-1 gap-1 text-sm">
                <div className="flex justify-between">
                  <span>/8 = 255.0.0.0</span>
                  <span className="text-gray-600">16.7M hosts (Class A)</span>
                </div>
                <div className="flex justify-between">
                  <span>/16 = 255.255.0.0</span>
                  <span className="text-gray-600">65K hosts (Class B)</span>
                </div>
                <div className="flex justify-between">
                  <span>/24 = 255.255.255.0</span>
                  <span className="text-gray-600">254 hosts (Class C)</span>
                </div>
                <div className="flex justify-between">
                  <span>/30 = 255.255.255.252</span>
                  <span className="text-gray-600">2 hosts (P2P Links)</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-blue-200">
                <h5 className="font-medium text-blue-700 mb-1">Private IP Ranges (RFC 1918)</h5>
                <div className="text-xs text-blue-600">
                  <div>• Class A: 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)</div>
                  <div>• Class B: 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)</div>
                  <div>• Class C: 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
            
            {!calculationResult ? (
              <div className="text-center py-8 text-gray-500">
                <p>Enter valid network parameters to see results</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h4 className="font-medium text-blue-800 mb-2">Network Information</h4>
                  <div className="bg-white p-4 rounded-md shadow-sm">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Network Address:</span>
                        <span className="font-mono font-medium">{calculationResult.networkAddress}/{calculationResult.cidr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Broadcast Address:</span>
                        <span className="font-mono font-medium">{calculationResult.broadcastAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subnet Mask:</span>
                        <span className="font-mono font-medium">{calculationResult.subnetMask}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Wildcard Mask:</span>
                        <span className="font-mono font-medium">{calculationResult.wildcardMask}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-blue-800 mb-2">Host Information</h4>
                  <div className="bg-white p-4 rounded-md shadow-sm">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Hosts:</span>
                        <span className="font-medium">{calculationResult.totalHosts.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Usable Hosts:</span>
                        <span className="font-medium">{calculationResult.usableHosts.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">First Usable IP:</span>
                        <span className="font-mono font-medium">{calculationResult.firstUsableIP}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Usable IP:</span>
                        <span className="font-mono font-medium">{calculationResult.lastUsableIP}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-blue-800 mb-2">Binary Representation</h4>
                  <div className="bg-white p-4 rounded-md shadow-sm">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Network:</span>
                        <div className="font-mono bg-gray-50 p-2 rounded mt-1 break-all">
                          {calculationResult.networkBinary}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Subnet Mask:</span>
                        <div className="font-mono bg-gray-50 p-2 rounded mt-1 break-all">
                          {calculationResult.subnetMaskBinary}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Broadcast:</span>
                        <div className="font-mono bg-gray-50 p-2 rounded mt-1 break-all">
                          {calculationResult.broadcastBinary}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-100 p-3 rounded-md border border-green-300">
                  <h4 className="font-medium text-green-800 mb-2">Network Summary</h4>
                  <p className="text-green-700 text-sm">
                    This /{calculationResult.cidr} network provides {calculationResult.usableHosts.toLocaleString()} usable IP addresses 
                    from {calculationResult.firstUsableIP} to {calculationResult.lastUsableIP}.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        // VLSM Calculator
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* VLSM Input Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-4">VLSM Configuration</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Major Network
              </label>
              <input
                type="text"
                value={majorNetwork}
                onChange={(e) => setMajorNetwork(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="192.168.1.0"
              />
            </div>

            {/* Private Network Range Selection for VLSM */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Select Private Networks
              </label>
              <div className="grid grid-cols-1 gap-2">
                {privateNetworkRanges.map((range) => (
                  <button
                    key={range.class}
                    onClick={() => selectPrivateRange(range)}
                    className="text-left p-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="font-medium text-gray-800">{range.class}</div>
                    <div className="text-sm text-gray-600">{range.description}</div>
                    <div className="text-xs text-blue-600 mt-1">Network: {range.network}/{range.cidr}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Major Network CIDR
              </label>
              <input
                type="number"
                min="8"
                max="30"
                value={majorNetworkCIDR}
                onChange={(e) => setMajorNetworkCIDR(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="border-t border-gray-300 my-4"></div>

            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-700">Subnet Requirements</h4>
              <button
                onClick={addVLSMSubnet}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Subnet
              </button>
            </div>

            {vlsmSubnets.map((subnet, index) => (
              <div key={subnet.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium text-gray-700">Subnet {index + 1}</h5>
                  {vlsmSubnets.length > 1 && (
                    <button 
                      onClick={() => removeVLSMSubnet(subnet.id)} 
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subnet Name</label>
                    <input
                      type="text"
                      value={subnet.name}
                      onChange={(e) => updateVLSMSubnet(subnet.id, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., VLAN 10 - Servers"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Required Hosts</label>
                    <input
                      type="number"
                      min="1"
                      value={subnet.requiredHosts}
                      onChange={(e) => updateVLSMSubnet(subnet.id, 'requiredHosts', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-4">
              <button
                onClick={calculateVLSM}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
              >
                Calculate VLSM
              </button>
              {vlsmCalculated && (
                <button
                  onClick={resetVLSM}
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* VLSM Results Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-4 text-blue-700">VLSM Results</h3>
            
            {!vlsmCalculated ? (
              <div className="text-center py-8 text-gray-500">
                <p>Configure subnet requirements and click Calculate VLSM</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h4 className="font-medium text-blue-800 mb-2">Subnet Allocation Summary</h4>
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <p className="text-sm text-gray-600 mb-2">
                      Major Network: <span className="font-mono font-medium">{majorNetwork}/{majorNetworkCIDR}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Total Subnets Configured: <span className="font-medium">{vlsmSubnets.length}</span>
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-blue-800 mb-2">Detailed Subnet Information</h4>
                  <div className="space-y-4">
                    {vlsmSubnets.map((subnet, index) => (
                      <div key={subnet.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                        <div className="mb-2">
                          <h5 className="font-medium text-gray-800">
                            {subnet.name || `Subnet ${index + 1}`}
                          </h5>
                          <p className="text-sm text-gray-600">
                            Required: {subnet.requiredHosts} hosts | Allocated: {subnet.actualHosts} hosts
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Network:</span>
                            <span className="font-mono font-medium">{subnet.networkAddress}/{subnet.allocatedCIDR}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subnet Mask:</span>
                            <span className="font-mono font-medium">{subnet.subnetMask}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Usable Range:</span>
                            <span className="font-mono font-medium">{subnet.firstUsableIP} - {subnet.lastUsableIP}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Broadcast:</span>
                            <span className="font-mono font-medium">{subnet.broadcastAddress}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-100 p-3 rounded-md border border-green-300">
                  <h4 className="font-medium text-green-800 mb-2">VLSM Summary</h4>
                  <p className="text-green-700 text-sm">
                    Successfully allocated {vlsmSubnets.length} subnets using Variable Length Subnet Masking. 
                    Each subnet is optimally sized for its host requirements.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Network address and broadcast address cannot be assigned to hosts</li>
          <li>VLSM allows for efficient IP address allocation by sizing subnets based on actual requirements</li>
          <li>When subnetting, always allocate larger subnets first to avoid address space fragmentation</li>
          <li>Consider future growth when determining host requirements for each subnet</li>
          <li><strong>Private IP Ranges (RFC 1918):</strong></li>
          <li className="ml-4">• <strong>Class A:</strong> 10.0.0.0/8 - Large enterprises, data centers (16.7M addresses)</li>
          <li className="ml-4">• <strong>Class B:</strong> 172.16.0.0/12 - Medium networks, campus networks (1M addresses)</li>
          <li className="ml-4">• <strong>Class C:</strong> 192.168.0.0/16 - Small offices, home networks (65K addresses)</li>
          <li>Point-to-point links typically use /30 (4 addresses, 2 usable) or /31 networks</li>
          <li>Always use private IP ranges for internal networks to avoid conflicts with public internet addresses</li>
        </ul>
      </div>
    </div>
  );
};

export default IPSubnetCalculator;