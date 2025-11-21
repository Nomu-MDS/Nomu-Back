import { DataTypes } from "sequelize";

export default (sequelize) => {
    const Interest = sequelize.define("Interest", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        icon: DataTypes.STRING,
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    }, {
        tableName: 'interests',
        underscored: true
    });

    return Interest;
};
