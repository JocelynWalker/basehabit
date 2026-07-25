// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseHabit {
    struct Habit {
        address creator;
        string name;
        bool active;
        uint256 createdAt;
        uint256 totalCheckIns;
    }

    address public owner;
    uint256 public habitCount;
    uint256 public totalCheckIns;
    uint256 public createPoints = 10;
    uint256 public checkInPoints = 5;
    uint256 public streakBonus = 2;
    uint256 public referrerBonus = 20;
    uint256 public userBonus = 10;
    uint256 public constant MAX_NAME_LENGTH = 64;

    mapping(uint256 => Habit) public habits;
    mapping(address => uint256) public walletHabitCount;
    mapping(address => uint256) public walletCheckInCount;
    mapping(address => uint256) public rewardPoints;
    mapping(address => uint256) public currentStreak;
    mapping(address => uint256) public lastCheckInDay;
    mapping(uint256 => mapping(address => uint256)) public habitCheckInCount;
    mapping(address => address) public referralOf;

    event HabitCreated(uint256 indexed habitId, address indexed creator, string name, address indexed referrer);
    event CheckedIn(uint256 indexed habitId, address indexed user, uint256 day, uint256 streak, uint256 points);
    event HabitActiveSet(uint256 indexed habitId, bool active);
    event PointsSet(uint256 createPoints, uint256 checkInPoints, uint256 streakBonus, uint256 referrerBonus, uint256 userBonus);
    event ReferralSet(address indexed user, address indexed referrer);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createHabit(string calldata name, address referrer) external {
        bytes calldata b = bytes(name);
        require(b.length > 0 && b.length <= MAX_NAME_LENGTH, "bad name");
        _refer(msg.sender, referrer);
        uint256 id = ++habitCount;
        habits[id] = Habit(msg.sender, name, true, block.timestamp, 0);
        walletHabitCount[msg.sender]++;
        rewardPoints[msg.sender] += createPoints;
        emit HabitCreated(id, msg.sender, name, referralOf[msg.sender]);
    }

    function checkIn(uint256 habitId, address referrer) external {
        Habit storage h = habits[habitId];
        require(h.creator != address(0), "bad habit");
        require(h.active, "inactive");
        _refer(msg.sender, referrer);
        uint256 day = block.timestamp / 1 days;
        uint256 previousDay = lastCheckInDay[msg.sender];
        if (previousDay == 0) currentStreak[msg.sender] = 1;
        else if (day > previousDay + 1) currentStreak[msg.sender] = 1;
        else if (day == previousDay + 1) currentStreak[msg.sender]++;
        lastCheckInDay[msg.sender] = day;
        h.totalCheckIns++;
        totalCheckIns++;
        walletCheckInCount[msg.sender]++;
        habitCheckInCount[habitId][msg.sender]++;
        uint256 points = checkInPoints + (day == previousDay ? 0 : streakBonus);
        rewardPoints[msg.sender] += points;
        emit CheckedIn(habitId, msg.sender, day, currentStreak[msg.sender], rewardPoints[msg.sender]);
    }

    function setHabitActive(uint256 habitId, bool active) external {
        Habit storage h = habits[habitId];
        require(h.creator != address(0), "bad habit");
        require(msg.sender == h.creator || msg.sender == owner, "not allowed");
        h.active = active;
        emit HabitActiveSet(habitId, active);
    }

    function setPoints(uint256 _createPoints, uint256 _checkInPoints, uint256 _streakBonus, uint256 _referrerBonus, uint256 _userBonus) external onlyOwner {
        createPoints = _createPoints;
        checkInPoints = _checkInPoints;
        streakBonus = _streakBonus;
        referrerBonus = _referrerBonus;
        userBonus = _userBonus;
        emit PointsSet(_createPoints, _checkInPoints, _streakBonus, _referrerBonus, _userBonus);
    }

    function getHabit(uint256 habitId) external view returns (address creator, string memory name, bool active, uint256 createdAt, uint256 habitTotalCheckIns) {
        Habit storage h = habits[habitId];
        return (h.creator, h.name, h.active, h.createdAt, h.totalCheckIns);
    }

    function getUser(address user) external view returns (uint256 created, uint256 checkIns, uint256 points, uint256 streak, uint256 lastDay, address referrer) {
        return (walletHabitCount[user], walletCheckInCount[user], rewardPoints[user], currentStreak[user], lastCheckInDay[user], referralOf[user]);
    }

    function _refer(address user, address referrer) internal {
        if (referralOf[user] == address(0) && referrer != address(0) && referrer != user) {
            referralOf[user] = referrer;
            rewardPoints[referrer] += referrerBonus;
            rewardPoints[user] += userBonus;
            emit ReferralSet(user, referrer);
        }
    }
}
