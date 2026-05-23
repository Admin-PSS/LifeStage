using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeStageAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAcsUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AcsUserId",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AcsUserId",
                table: "AspNetUsers");
        }
    }
}
