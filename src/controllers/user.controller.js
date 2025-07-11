import { asynchandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { deleteImageByUrl, ulpoadOnCloudinary } from "../utils/cloudinary.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const genarateAccessandRefreshToken = async (userID) => {
    try {
        const user = await User.findById(userID)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access and Refresh Tokens!s")
    }

}

const registerUser = asynchandler(async (req, res) => {

    const { fullname, email, username, password } = req.body

    if ([fullname, email, username, password].some((field) => field?.trim === "")) {
        throw new ApiError(400, "All fields are required!")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "Username or Email already exists!")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required!")
    }

    const avatar = await ulpoadOnCloudinary(avatarLocalPath);

    const coverImage = await ulpoadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is not uploaded on Cloudinary!")
    }

    const user = await User.create(
        {
            username: username.toLowerCase(),
            email,
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            password
        }
    )

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" //The field not required
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the User")

    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!")
    )
})

const loginUser = asynchandler(async (req, res) => {

    const { username, email, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required!")
    }

    const user = await User.findOne(
        { $or: [{ username }, { email }] }
    )

    if (!user) {
        throw new ApiError(404, "User does not exist!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password!")
    }

    const { accessToken, refreshToken } = await genarateAccessandRefreshToken(user._id)

    const loggedinUser = await User.findById(user._id).select("-password -refreshToken")

    //Generating cookies for access and refresh tokens
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedinUser, accessToken, refreshToken
                }, "User logged in Successfully!"
            )
        )
})

const logoutUser = asynchandler( async (req, res) => 
{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse(200, {}, "User logged out!"))
})

const refreshAccessToken = asynchandler(async(req, res) => 
{
    
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken)
        {
            throw new ApiError(401, "Unauthorized Access!")
        }
    
        try {
        const decodedTokwn = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedTokwn?._id)
    
        if(!user)
        {
            throw new ApiError(401, "Invalid refresh token!")
        }
    
        if(incomingRefreshToken !== user?.refreshToken)
        {
            throw new ApiError(401, "Refresh token is expired or used!")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken } = await genarateAccessandRefreshToken(user._id)
    
        return res.
        status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", newRefreshToken)
        .json(
            new ApiResponse(200, 
                {accessToken, newRefreshToken},
                "Access token refreshed successfully!"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token!")
    }
})

const changeCurrentPassword = asynchandler(async(req, res) =>
{
    const {oldPassword, newPasword} = req.body
    
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect)
    {
        throw new ApiError(400, "Invalid Old Password!")
    }

    user.password = newPasword //Password will be hashed automatically
    await user.save({validateBeforeSave: false})

    return res.
    status(200)
    .json(new ApiResponse(200, {}, "Password changed successfuly!"))

})

const getCurrentUser = asynchandler(async(req, res) =>
{
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully!")
})

const updateAccountDetails = asynchandler(async(req, res) =>
{
    const {fullName, email} = req.body

    if(!fullName || !email)
    {
        throw new ApiError(400, "All fields required!")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully!"))
})

const updateUserAvatar = asynchandler(async(req, res) =>
{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath)
    {
        throw new ApiError(400, "Avatar file is missing!")
    }

    const avatar = await ulpoadOnCloudinary(avatarLocalPath)

    if(!avatar.url)
    {
        throw new ApiError(400, "Error uploading avatar!")
    }

    const deleteImageResponse = deleteImageByUrl(req.user?.coverImage)

    if(!deleteImageResponse)
    {
        throw new ApiError(401, "Error deleting old Image!")
    }

    const user = await findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar : avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(200, user, "Avatar updated successfully!")
})

const updateUserCoverImage = asynchandler(async(req, res) =>
{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath)
    {
        throw new ApiError(400, "Avatar file is missing!")
    }

    const coverImage = await ulpoadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url)
    {
        throw new ApiError(400, "Error uploading avatar!")
    }

    const deleteImageResponse = deleteImageByUrl(req.user?.avatar)

    if(!deleteImageResponse)
    {
        throw new ApiError(401, "Error deleting old Image!")
    }

    const user = await findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage : coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(200, user, "Cover Image updated successfully!")
})

export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
 }