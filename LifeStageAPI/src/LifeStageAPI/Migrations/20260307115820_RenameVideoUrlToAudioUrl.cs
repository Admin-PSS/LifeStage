using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeStageAPI.Migrations
{
    /// <inheritdoc />
    public partial class RenameVideoUrlToAudioUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "VideoUrl",
                table: "Posts",
                newName: "AudioUrl");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "AudioUrl",
                table: "Posts",
                newName: "VideoUrl");
        }
    }
}
