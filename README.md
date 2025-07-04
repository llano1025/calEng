# Engineering Calculator

A comprehensive web-based engineering calculator suite built with React and TypeScript, providing specialized calculators for multiple engineering disciplines.

## 🚀 Features

### Engineering Disciplines Supported

- **Electrical Systems**
  - Cable Sizing & Containment
  - Circuit Protection & Coordination
  - Power Factor Correction
  - Transformer & Generator Sizing
  - Load Estimation & Balancing
  - Lighting Power Density
  - UPS Systems

- **Extra Low Voltage (ELV)**
  - CCTV System Design
  - Access Control Systems
  - Audio Visual Systems
  - Public Address Systems
  - Wireless Coverage Planning
  - Optical Fiber Calculations
  - IP Network Subnetting

- **MVAC (Mechanical Ventilation & Air Conditioning)**
  - AHU Sizing with Psychrometric Calculations
  - Chilled Water Pipe Sizing
  - Duct Static Pressure
  - Refrigerant Pipe Calculations
  - Steam Pipe Sizing
  - Vibration Isolator Selection

- **Fire Services**
  - Sprinkler System Design
  - Fire Pump Sizing
  - Smoke Extraction Systems
  - Fire Alarm System Design

- **Medical Gas Systems**
  - Oxygen System Design
  - Compressed Air Systems
  - Vacuum System Design
  - Nitrous Oxide Distribution

- **Pumping and Drainage**
  - Sump Pump Sizing
  - Drainage Pipe Sizing
  - Greywater Systems
  - Stormwater Management

- **Vertical Transportation**
  - Elevator Traffic Analysis
  - Escalator Capacity Calculations
  - Lift Power Requirements
  - Shaft Sizing

### Key Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Interactive Calculations**: Real-time results with proper unit handling
- **Professional UI**: Clean, modern interface with smooth animations
- **Comprehensive Coverage**: Specialized calculators for 7 core engineering disciplines
- **TypeScript**: Full type safety and better developer experience

## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.x
- **Icons**: Lucide React
- **Development**: Hot Module Replacement (HMR) with Vite

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── DisciplineSelection.tsx
│   └── Icons.tsx
├── calculators/         # Calculator components
│   ├── electrical/      # Electrical system calculators
│   ├── elv/            # ELV system calculators
│   ├── mvac/           # MVAC system calculators
│   ├── ElectricalCalculator.tsx
│   ├── ELVCalculator.tsx
│   ├── MVACalculator.tsx
│   └── GenericCalculator.tsx
├── data/               # Configuration and lookup tables
│   ├── systems.tsx     # Engineering disciplines config
│   └── cop_tables.tsx  # Electrical calculation tables
├── styles/
│   └── index.css
├── App.tsx            # Main application component
└── main.tsx           # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/username/calEng.git
cd calEng
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit
```

## 📱 Usage

1. **Select Discipline**: Choose from the available engineering disciplines on the home screen
2. **Choose Calculator**: Select the specific calculator for your needs
3. **Enter Parameters**: Input your design parameters in the provided fields
4. **View Results**: Get instant calculations with proper units and formatting
5. **Navigate**: Use the back button to return to discipline selection

## 🔧 Configuration

The application uses several configuration files:

- `tailwind.config.js` - Tailwind CSS configuration
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration
- `postcss.config.js` - PostCSS configuration

## 📊 Calculator Features

### Electrical Calculators
- **Cable Sizing**: Comprehensive cable selection based on current capacity and voltage drop
- **Load Estimation**: Project-wide electrical load calculations with diversity factors
- **Circuit Protection**: Fuse and breaker coordination
- **Power Systems**: Transformer sizing, generator selection, UPS calculations

### ELV Calculators
- **CCTV Systems**: Storage, bandwidth, coverage, and power calculations
- **Network Design**: IP subnetting and wireless coverage planning
- **Audio Visual**: PA system design and impedance matching
- **Fiber Optics**: Loss budget and system design

### MVAC Calculators
- **AHU Sizing**: Complete air handling unit sizing with psychrometric calculations
- **Piping Systems**: Chilled water, refrigerant, and steam pipe sizing
- **Duct Design**: Static pressure calculations
- **Vibration Control**: Isolator selection

### Fire Services Calculators
- **Sprinkler Systems**: Design and flow rate calculations
- **Fire Pumps**: Sizing and pressure requirements
- **Smoke Extraction**: Ventilation system design
- **Fire Alarms**: Detection and alarm system design

### Medical Gas Calculators
- **Oxygen Systems**: Medical oxygen distribution design
- **Compressed Air**: Medical air system calculations
- **Vacuum Systems**: Medical suction system design
- **Gas Distribution**: Nitrous oxide and other medical gases

### Pumping and Drainage Calculators
- **Sump Pumps**: Capacity and head calculations
- **Drainage Design**: Pipe sizing and flow capacity
- **Water Management**: Greywater and stormwater systems
- **System Optimization**: Flow and pressure optimization

### Vertical Transportation Calculators
- **Traffic Analysis**: Elevator passenger flow and capacity
- **Escalator Design**: Capacity and flow calculations
- **Power Systems**: Electrical requirements for lifts
- **Space Planning**: Shaft sizing and dimensional requirements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with modern web technologies for optimal performance
- Designed for professional engineers and technical consultants
- Continuously updated with industry standards and best practices

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

*Built with ❤️ for the engineering community*