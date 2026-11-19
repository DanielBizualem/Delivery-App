# Delivery Application

A city-based delivery platform that connects **customers**, **company admins**, and **bike riders** in one system. Customers place delivery orders, admins assign drivers and monitor operations, and drivers receive and complete assignments.

## Features

### Customer
- Place an order with a pickup and drop-off location
- Automatic distance calculation
- Enter material amount and weight
- Automatic price calculation based on distance and weight
- Payment
- Unique order code for every order
- See the assigned rider's full name and phone number
- Profile with number of orders / cart and user rank
- Track the list of materials being delivered or in process
- Company profile page
- Notifications
- Rate drivers
- Comment box

### Company / Admin
- View new delivery orders, sorted by time
- Assign a driver to an order
- Decline or change a driver assignment
- Dashboard with analytics and coverage area
- Receive notifications from drivers
- Register new drivers and set up their profiles
- List of all drivers
- List of customers with their scores
- Comment box

### Driver
- Receive new assignments
- Profile: full name, phone number, user code, parent's full name and phone number, rating and score
- History of successfully delivered orders
- Send notifications to the admin office

## Planned Features (City Delivery)
- **Live GPS tracking:** customers follow their rider on a map in real time
- **Delivery confirmation:** the order code is used as proof of delivery when the rider hands over the item
- **Zone-based pricing:** set rates per city zone, plus peak-hour pricing
- **Driver availability status:** riders mark themselves online or offline so admins assign only available drivers

## Tech Stack
<!-- Update with your stack, for example: -->
- Frontend: 
- Backend: Node.js, Express
- Database: 
- Maps / Distance API: 

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

# Install dependencies
npm install

# Run in development
npm run dev
```

## User Roles
| Role | Purpose |
|------|---------|
| Customer | Orders deliveries, pays, rates drivers |
| Admin | Manages orders, drivers, customers, and analytics |
| Driver | Accepts assignments and completes deliveries |

## License
MIT